// Builds the static website into the "dist" directory.
// - `tsx ./scripts/build.ts` produces a production build.
// - `tsx ./scripts/build.ts --dev` also watches for changes and serves "dist" locally.

import { buildScript, script } from "complete-node";
import esbuild from "esbuild";
import { watch } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const DEV_PORT = 8000;
const STATIC_COPY_DEBOUNCE_MS = 200;

/**
 * The Rubik weights and subsets that are self-hosted. Rubik is only used for headings and numbers
 * (weight 600, in "static/css/base.css"). Add a weight here if the CSS starts to use it.
 */
const FONT_WEIGHTS = [600] as const;
const FONT_SUBSETS = ["latin"] as const;

const dev = process.argv.includes("--dev");

/**
 * The notice at the top of "main.js". The bundle is what visitors receive, so it says what it is,
 * who wrote it, its license, and where its source is. The `/*!` comment survives minification.
 */
const BANNER = `/*!
 * Isaac Save Viewer
 * Copyright (C) 2021-2025 Zamiell and contributors (https://github.com/Zamiell/isaac-save-viewer)
 * Copyright (C) 2026 Peru Manterola (modified version, forked on 2026-11-14)
 *
 * This program is free software under the GNU General Public License, version 3, WITHOUT ANY
 * WARRANTY. See "LICENSE.txt" next to this file.
 * Source code: https://github.com/PeruManterola/isaac-save-viewer
 *
 * Includes icons from Tabler Icons (https://tabler.io/icons), MIT License,
 * Copyright (c) 2020-2026 Paweł Kuna. See "lib/tabler-icons/LICENSE.txt".
 */`;

await (dev
  ? script(import.meta.dirname, async (packageRoot) => {
      await startDevServer(packageRoot);
    })
  : buildScript(import.meta.dirname, async (packageRoot) => {
      await build(packageRoot);
    }));

function getPaths(packageRoot: string) {
  const distDir = path.join(packageRoot, "dist");
  return {
    distDir,
    staticDir: path.join(packageRoot, "static"),
    nodeModulesDir: path.join(packageRoot, "node_modules"),
    libDir: path.join(distDir, "lib"),
  };
}

function getBuildOptions(packageRoot: string): esbuild.BuildOptions {
  const { distDir } = getPaths(packageRoot);
  return {
    entryPoints: [path.join(packageRoot, "src", "main.ts")],
    outfile: path.join(distDir, "main.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2021",
    sourcemap: true,
    minify: !dev,
    banner: { js: BANNER },
    // The Kaitai Struct runtime lazily requires these for features that the save file format does
    // not use (non-UTF-8 strings and zlib compression).
    external: ["iconv-lite", "pako", "zlib"],
    logLevel: "info",
  };
}

async function build(packageRoot: string) {
  // Do not keep files from earlier builds (for example, libraries that are no longer used).
  await fs.rm(getPaths(packageRoot).distDir, { recursive: true, force: true });
  await copyAssets(packageRoot);
  await esbuild.build(getBuildOptions(packageRoot));
}

async function startDevServer(packageRoot: string) {
  const { distDir, staticDir } = getPaths(packageRoot);
  await fs.rm(distDir, { recursive: true, force: true });
  await copyAssets(packageRoot);

  const context = await esbuild.context(getBuildOptions(packageRoot));
  await context.watch();
  const { port } = await context.serve({ servedir: distDir, port: DEV_PORT });
  console.log(`Serving "dist" at: http://localhost:${port}/`);

  // The esbuild watcher only watches the bundled source files, so we copy changed static files
  // ourselves. (Saving a file can emit several events, so we debounce them.)
  let timeout: NodeJS.Timeout | undefined;
  watch(staticDir, { recursive: true }, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      copyStatic(packageRoot).catch((error: unknown) => {
        console.error("Failed to copy the static files:", error);
      });
    }, STATIC_COPY_DEBOUNCE_MS);
  });
}

async function copyAssets(packageRoot: string) {
  await copyStatic(packageRoot);
  await copyFont(packageRoot);
  await copyLicenses(packageRoot);
}

/**
 * The GPL requires that a copy of the license goes with the program, and the MIT License of Tabler
 * Icons (bundled into "main.js") requires that its notice goes with any copy. The ".txt" extension
 * makes the server send them as text, so the footer link opens them in the browser.
 */
async function copyLicenses(packageRoot: string) {
  const { distDir, nodeModulesDir, libDir } = getPaths(packageRoot);
  await fs.copyFile(
    path.join(packageRoot, "LICENSE"),
    path.join(distDir, "LICENSE.txt"),
  );

  const tablerDir = path.join(libDir, "tabler-icons");
  await fs.mkdir(tablerDir, { recursive: true });
  await fs.copyFile(
    path.join(nodeModulesDir, "@tabler", "icons", "LICENSE"),
    path.join(tablerDir, "LICENSE.txt"),
  );
}

async function copyStatic(packageRoot: string) {
  const { distDir, staticDir } = getPaths(packageRoot);
  await fs.cp(staticDir, distDir, { recursive: true });

  // The Docker image's server caches ".js" and ".css" files for a year (but not "index.html"), so
  // we add the version to their URLs to make browsers fetch the new files after each release.
  // Shortcut: manual "edge" builds share the last release's version, so they do not bust caches.
  const packageJSON = JSON.parse(
    await fs.readFile(path.join(packageRoot, "package.json"), "utf8"),
  ) as { version: string };
  const indexPath = path.join(distDir, "index.html");
  const html = await fs.readFile(indexPath, "utf8");
  await fs.writeFile(
    indexPath,
    html.replaceAll(
      /(?<attribute>src|href)="(?<url>[^"]+\.(?:js|css))"/g,
      `$<attribute>="$<url>?v=${packageJSON.version}"`,
    ),
  );
}

async function copyFont(packageRoot: string) {
  const { nodeModulesDir, libDir } = getPaths(packageRoot);
  const fontSourceDir = path.join(nodeModulesDir, "@fontsource", "rubik");
  const fontDir = path.join(libDir, "rubik");
  const fontFilesDir = path.join(fontDir, "files");
  await fs.mkdir(fontFilesDir, { recursive: true });

  // Combine the per-weight stylesheets into a single file. Only the WOFF2 files are kept (every
  // browser that can run this page supports them), and only the files that the CSS references are
  // copied.
  const stylesheets = await Promise.all(
    FONT_SUBSETS.flatMap((subset) =>
      FONT_WEIGHTS.map(
        async (weight) =>
          await fs.readFile(
            path.join(fontSourceDir, `${subset}-${weight}.css`),
            "utf8",
          ),
      ),
    ),
  );
  const css = stylesheets
    .join("\n")
    .replaceAll(/, url\([^)]+\.woff\) format\('woff'\)/g, "");
  await fs.writeFile(path.join(fontDir, "rubik.css"), css);

  const fontFileNames = new Set(
    [...css.matchAll(/url\(\.\/files\/(?<fileName>[^)]+)\)/g)].map(
      (match) => match.groups?.["fileName"] ?? "",
    ),
  );
  fontFileNames.delete("");
  await Promise.all(
    [...fontFileNames].map(async (fileName) => {
      await fs.copyFile(
        path.join(fontSourceDir, "files", fileName),
        path.join(fontFilesDir, fileName),
      );
    }),
  );
  await fs.copyFile(
    path.join(fontSourceDir, "LICENSE"),
    path.join(fontDir, "LICENSE"),
  );
}
