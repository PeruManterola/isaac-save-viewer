// Checks the colour contrast of both themes against WCAG 2.2, using the colour tokens in
// "static/css/tokens.css" and the pairs that the stylesheets actually use.

// Usage: npx tsx scripts/check-contrast.ts (or "npm run check:contrast")

// It prints a table, and exits with a non-zero code if any pair fails or cannot be checked.
//   - Text needs 4.5:1 (1.4.3), or 3:1 when it is large (24px, or 18.66px and bold).
//   - Non-text parts that identify a control or its state need 3:1 against the colours next to them
//     (1.4.11): control outlines, focus rings, the fill of a progress bar, selected states. A
//     colour with an alpha channel (for example "--count-bg") is composited over the colour that it
//     is painted on, so a layer is listed after the one below it. A value that the script cannot
//     read (such as "color-mix()") makes the pair "unchecked", which fails, so that it cannot slip
//     by.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Color } from "./lib/contrast.js";
import {
  compositeLayers,
  contrastRatio,
  parseColor,
  parseTokenSets,
} from "./lib/contrast.js";

const TOKENS_PATH = path.join(
  import.meta.dirname,
  "..",
  "static",
  "css",
  "tokens.css",
);

const TEXT = 4.5;
const LARGE_TEXT = 3;
const UI = 3;

/**
 * One token, or several (the first is the bottom layer) when a translucent one is painted on it.
 */
type Layers = string | readonly string[];

interface Pair {
  readonly kind: "text" | "large text" | "ui";
  readonly foreground: Layers;
  readonly background: Layers;
  /** Where the stylesheets use it. */
  readonly where: string;
}

const text = (foreground: Layers, background: Layers, where: string): Pair => ({
  kind: "text",
  foreground,
  background,
  where,
});

const largeText = (
  foreground: Layers,
  background: Layers,
  where: string,
): Pair => ({ kind: "large text", foreground, background, where });

const ui = (foreground: Layers, background: Layers, where: string): Pair => ({
  kind: "ui",
  foreground,
  background,
  where,
});

const MINIMUM = {
  text: TEXT,
  "large text": LARGE_TEXT,
  ui: UI,
} as const satisfies Record<Pair["kind"], number>;

// Every pair below is read from "base.css", "shell.css", "entries.css" and "marks.css". Both themes
// use the same list.
const PAIRS = [
  // Text on the page (--bg).
  text("ink", "bg", "body text; header title; footer link on hover"),
  text(
    "ink-2",
    "bg",
    ".lede; footer text and links; .privacy; .muted outside a card",
  ),
  text("accent", "bg", "links on the page (landing lede link)"),
  text("accent-hover", "bg", "a:hover on the page"),

  // Text on a card (--surface).
  text(
    "ink",
    "surface",
    ".card, .stat, .chip, .pop, .want text; .cat-name; .search-input; .btn-ghost; .stat .foot b",
  ),
  text(
    "ink-2",
    "surface",
    ".muted, .small, .or, .tile-key legend, .stat .lbl/.of/.foot, .cnt, .row-text .id/.req, .want .id/.pool, .pop dt, .no-matches, .search placeholder and icon, .cat-toggle chevron, .pop-x, .privacy",
  ),
  text(
    "accent",
    "surface",
    "links in a card (.pop .link, Pastebin link); .marks-todo .badge.need",
  ),
  text("accent-hover", "surface", "a:hover in a card"),
  largeText("ink", "surface", ".stat .num (32px)"),

  // Text on a sunken surface (--surface-2).
  text(
    "ink",
    "surface-2",
    ".row-btn:hover name; .path code; .btn-ghost:hover; .search-clear:hover; .pop-x:hover; .marks-legend list",
  ),
  text(
    "ink-2",
    "surface-2",
    ".seg button (not selected); .row-btn:hover .id/.req; .marks-legend counter and note",
  ),
  text("ink", "line", ".seg button:hover"),

  // The "?" shown when an entry has no icon (.px-missing), on a tile or a row icon.
  text("ink-2", "locked-bg", ".px-missing on a locked tile or row icon"),
  text(
    "ink-2",
    ["locked-bg", "hatch"],
    ".px-missing on the stripes of a locked tile (worst case)",
  ),

  // The count pill inside a segmented button (.seg .n).
  text("ink-2", ["surface-2", "count-bg"], ".seg .n, button not selected"),
  text("ink", ["line", "count-bg"], ".seg .n, button hovered"),
  text("on-accent", ["accent", "count-bg-on"], ".seg .n, button selected"),

  // Selected states and primary actions.
  text(
    "on-accent",
    "accent",
    ".btn-primary; .seg button selected; .logo; .drop.is-over .drop-ic",
  ),
  text("on-accent", "accent-hover", ".btn-primary:hover"),

  // Badges and fractions.
  text("ok", "ok-soft", ".badge.ok; .frac.ok; .marks-all-done icon"),
  text("ink", "ok-soft", ".marks-all-done text"),
  text("locked-ink", "locked-bg", ".badge.locked"),
  text(
    "accent",
    "accent-soft",
    ".badge.need; .frac.need; .alert strong and icon; .drop-ic; .drop.is-over",
  ),

  // Text on the tinted surface (--accent-soft).
  text(
    "ink",
    "accent-soft",
    ".alert text; .marks-todo names and title; .row-btn.is-sel name; .drop.is-over h2",
  ),
  text("ink-2", "accent-soft", ".row-btn.is-sel .id/.req"),

  // Outlines of controls (against the colours on each side).
  ui("line-strong", "bg", ".chip border (the file name in the header)"),
  ui(
    "line-strong",
    "surface",
    ".btn-ghost; .drop (dashed); .search-input; .no-matches (dashed); .want; .slot.empty; outer side of .tile.is-locked, .ric.is-locked and .pop-ic.is-locked",
  ),
  ui(
    "line-strong",
    "locked-bg",
    "dashed border of a locked tile, row icon and .want tile: inner side",
  ),

  // The accent as a shape.
  ui(
    "accent",
    "surface-2",
    ".bar i against its track; .seg button selected against the track",
  ),
  ui(
    "accent",
    "surface",
    ".btn-primary on a card; .tile.is-sel ring; .char.gap border; .marks-todo and .alert border; .stat:hover border",
  ),
  ui(
    "accent",
    "bg",
    ".btn-primary and .logo on the page; .alert border in .error-banner",
  ),
  ui(
    "accent",
    "accent-soft",
    ".alert, .marks-todo and .drop.is-over border against their fill; .tile.is-sel inner ring",
  ),

  // The lock badge on a locked tile.
  ui("badge-fg", "badge-bg", "the lock glyph on a locked tile"),
  ui("badge-bg", "locked-bg", "the lock badge against a locked tile"),
  ui("badge-bg", "surface", "the lock badge where it sticks out over the card"),

  // The success icon on the page.
  ui("ok", "bg", ".privacy icon"),

  // The drag overlay: --scrim is painted over whatever is on the page.
  ui("accent", ["bg", "scrim"], ".drop-overlay dashed outline over the page"),
  ui(
    "accent",
    ["surface", "scrim"],
    ".drop-overlay dashed outline over a card",
  ),
  text("ink", "accent-soft", ".drop-overlay card text"),

  // The focus ring (3px, outside the control) against what is outside it.
  ui("focus", "bg", ":focus-visible on the page"),
  ui("focus", "surface", ":focus-visible in a card; .pop:focus-visible"),
  ui("focus", "surface-2", ":focus-visible inside .seg"),
  ui("focus", "accent-soft", ":focus-visible on a selected row or an alert"),
  ui("focus", "locked-bg", ":focus-visible on a locked tile"),
] as const;

/** Things that the script does not check, and why. Printed at the end. */
const NOT_CHECKED = [
  "--line (card edges, row dividers, track and .seg borders, unlocked tile borders): decorative. Every control it surrounds is also identified by its text or icon.",
  '--hatch (stripes on a locked tile): behind an icon image, so only the "?" placeholder is checked against it, above.',
  ".row-btn.is-sel (--accent-soft row background, on --surface): the open popover and aria-expanded also say which row is selected. A tile gets a 3:1 ring.",
  "Pixel art (tile icons, mark icons, the 55% opacity of a locked icon): images, not text or UI shapes.",
  "--slot-bg: filled mark slots hold pixel art. The empty slot is a dashed --line-strong outline, which is checked above.",
  "--shadow, --shadow-pop: decoration.",
  ".badge has no outline. The lock badge on a tile is checked above.",
] as const;

/** Returns the colour, or the reason why it cannot be worked out. */
function resolve(
  tokens: ReadonlyMap<string, string>,
  layers: Layers,
): Color | string {
  const names = typeof layers === "string" ? [layers] : layers;
  const colors: Color[] = [];
  for (const name of names) {
    const value = tokens.get(name);
    if (value === undefined) {
      return `--${name} is not defined`;
    }

    const color = parseColor(value);
    if (color === undefined) {
      return `cannot read --${name}: ${value}`;
    }
    colors.push(color);
  }

  try {
    return compositeLayers(colors);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const LAYER_SEPARATOR = " + ";

function describe(layers: Layers): string {
  return typeof layers === "string" ? layers : layers.join(LAYER_SEPARATOR);
}

type Status = "pass" | "FAIL" | "UNCHECKED";

interface Row {
  readonly theme: string;
  readonly status: Status;
  readonly kind: Pair["kind"];
  readonly needed: number;
  readonly ratio: number | undefined;
  readonly pair: string;
  readonly where: string;
}

function checkTheme(
  theme: string,
  tokens: ReadonlyMap<string, string>,
): readonly Row[] {
  return PAIRS.map((pair) => {
    const foreground = resolve(tokens, pair.foreground);
    const background = resolve(tokens, pair.background);
    const needed = MINIMUM[pair.kind];
    const label = `${describe(pair.foreground)} on ${describe(pair.background)}`;
    const base = { theme, kind: pair.kind, needed, pair: label };

    const problem = [foreground, background].find(
      (value) => typeof value === "string",
    );
    if (typeof foreground === "string" || typeof background === "string") {
      return {
        ...base,
        status: "UNCHECKED",
        ratio: undefined,
        where: `${pair.where} (${problem})`,
      };
    }

    // A translucent foreground is painted over the background that it sits on.
    const ratio = contrastRatio(foreground, background);
    return {
      ...base,
      status: ratio >= needed ? "pass" : "FAIL",
      ratio,
      where: pair.where,
    };
  });
}

function printRows(rows: readonly Row[]) {
  const header = ["theme", "status", "ratio", "min", "pair", "used in"];
  const body = rows.map((row) => [
    row.theme,
    row.status,
    row.ratio === undefined
      ? "?"
      : `${(Math.floor(row.ratio * 100) / 100).toFixed(2)}:1`,
    `${row.needed}:1 (${row.kind})`,
    row.pair,
    row.where,
  ]);
  const widths = header.map((title, column) =>
    Math.max(title.length, ...body.map((line) => (line[column] ?? "").length)),
  );
  // The last column is free text.
  const widthsToPad = widths.slice(0, -1);
  const format = (line: readonly string[]) =>
    line
      .map((cell, column) =>
        column < widthsToPad.length
          ? cell.padEnd(widthsToPad[column] ?? 0)
          : cell,
      )
      .join("  ");

  console.log(format(header));
  console.log(
    format([...widthsToPad.map((width) => "-".repeat(width)), "-".repeat(7)]),
  );
  for (const line of body) {
    console.log(format(line));
  }
}

/** The dark colours are written twice in "tokens.css", and the copies must not drift apart. */
function checkDarkCopiesMatch(
  dark: ReadonlyMap<string, string>,
  darkAuto: ReadonlyMap<string, string>,
): readonly string[] {
  const problems: string[] = [];
  for (const [name, value] of dark) {
    if (darkAuto.get(name) !== value) {
      problems.push(
        `--${name} is "${value}" in [data-theme="dark"], but "${darkAuto.get(name) ?? "missing"}" in the prefers-color-scheme copy.`,
      );
    }
  }
  for (const name of darkAuto.keys()) {
    if (!dark.has(name)) {
      problems.push(`--${name} is only in the prefers-color-scheme copy.`);
    }
  }

  return problems;
}

const sets = parseTokenSets(readFileSync(TOKENS_PATH, "utf8"));

const rows = [
  ...checkTheme("light", sets.light),
  ...checkTheme("dark", sets.dark),
];
printRows(rows);

const problems = checkDarkCopiesMatch(sets.dark, sets.darkAuto);
const failed = rows.filter((row) => row.status !== "pass");
const checkedTokens = [...sets.light.keys()].filter((name) =>
  PAIRS.some((pair) =>
    [pair.foreground, pair.background].flat().includes(name),
  ),
);

console.log();
console.log("Not checked:");
for (const note of NOT_CHECKED) {
  console.log(`  - ${note}`);
}

console.log();
console.log(
  `${rows.length} pairs (${PAIRS.length} per theme) over ${checkedTokens.length} tokens.`,
);
for (const problem of problems) {
  console.log(`Dark copies differ: ${problem}`);
}
if (failed.length > 0 || problems.length > 0) {
  console.log(
    `${failed.length} pair(s) failed or could not be checked; ${problems.length} token copy problem(s).`,
  );
  process.exit(1);
}
console.log("Every pair passes.");
