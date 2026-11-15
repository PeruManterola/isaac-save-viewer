// Generates "src/data/icons.json": the Tabler Icons (https://tabler.io/icons) that the interface
// uses. Only the icons listed here are copied, so the bundle does not include the whole set.

// Usage: npm run data:icons

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/** The name in the app, and the name of the outline icon in Tabler. */
const ICON_NAMES = {
  alert: "alert-circle",
  "arrow-down": "arrow-down",
  check: "check",
  chevron: "chevron-down",
  close: "x",
  copy: "copy",
  "external-link": "external-link",
  file: "file",
  grid: "layout-grid",
  list: "list",
  lock: "lock",
  monitor: "device-desktop",
  moon: "moon",
  /** "Not done yet". */
  ring: "circle-dashed",
  search: "search",
  shield: "shield-check",
  sun: "sun",
  trophy: "trophy",
  upload: "upload",
} as const;

type Shape = readonly [
  tag: string,
  attributes: Readonly<Record<string, string>>,
];

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const ICONS_JSON_PATH = path.join(REPO_ROOT, "src", "data", "icons.json");

const require = createRequire(import.meta.url);
const nodesPath = require.resolve("@tabler/icons/tabler-nodes-outline.json");
const nodes = JSON.parse(readFileSync(nodesPath, "utf8")) as Record<
  string,
  readonly Shape[] | undefined
>;

const icons: Record<string, readonly Shape[]> = {};
for (const [name, tablerName] of Object.entries(ICON_NAMES)) {
  const shapes = nodes[tablerName];
  if (shapes === undefined) {
    throw new Error(`There is no Tabler icon named "${tablerName}".`);
  }
  icons[name] = shapes;
}

writeFileSync(ICONS_JSON_PATH, `${JSON.stringify(icons, undefined, 2)}\n`);
console.log(
  `Wrote ${Object.keys(icons).length} icons to: ${path.relative(REPO_ROOT, ICONS_JSON_PATH)}`,
);
