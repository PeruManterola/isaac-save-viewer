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

/** The Source Sans Pro weights that are self-hosted. (Bulma uses 400, 600, and 700.) */
const FONT_WEIGHTS = [400, 600, 700] as const;

const dev = process.argv.includes("--dev");

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
    // The Kaitai Struct runtime lazily requires these for features that the save file format does
    // not use (non-UTF-8 strings and zlib compression).
    external: ["iconv-lite", "pako", "zlib"],
    logLevel: "info",
  };
}

async function build(packageRoot: string) {
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
  await copyBulma(packageRoot);
  await copyFont(packageRoot);
}

async function copyStatic(packageRoot: string) {
  const { distDir, staticDir } = getPaths(packageRoot);
  await fs.cp(staticDir, distDir, { recursive: true });
}

async function copyBulma(packageRoot: string) {
  const { nodeModulesDir, libDir } = getPaths(packageRoot);
  const bulmaDir = path.join(libDir, "bulma");
  await fs.mkdir(bulmaDir, { recursive: true });
  await fs.copyFile(
    path.join(nodeModulesDir, "bulma", "css", "bulma.min.css"),
    path.join(bulmaDir, "bulma.min.css"),
  );
  await fs.copyFile(
    path.join(nodeModulesDir, "bulma", "LICENSE"),
    path.join(bulmaDir, "LICENSE"),
  );
}

async function copyFont(packageRoot: string) {
  const { nodeModulesDir, libDir } = getPaths(packageRoot);
  const fontSourceDir = path.join(
    nodeModulesDir,
    "@fontsource",
    "source-sans-pro",
  );
  const fontDir = path.join(libDir, "source-sans-pro");
  const fontFilesDir = path.join(fontDir, "files");
  await fs.mkdir(fontFilesDir, { recursive: true });

  // Combine the per-weight stylesheets into a single file, then copy only the font files that it
  // references.
  const stylesheets = await Promise.all(
    FONT_WEIGHTS.map(
      async (weight) =>
        await fs.readFile(path.join(fontSourceDir, `${weight}.css`), "utf8"),
    ),
  );
  const css = stylesheets.join("\n");
  await fs.writeFile(path.join(fontDir, "source-sans-pro.css"), css);

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
