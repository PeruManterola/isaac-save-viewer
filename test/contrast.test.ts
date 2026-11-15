// The colour maths of "scripts/check-contrast.ts", and the colour tokens that the app ships.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  compositeLayers,
  compositeOver,
  contrastRatio,
  parseColor,
  parseTokenSets,
  relativeLuminance,
} from "../scripts/lib/contrast.js";

const WHITE = { r: 255, g: 255, b: 255, a: 1 } as const;
const BLACK = { r: 0, g: 0, b: 0, a: 1 } as const;

function color(value: string) {
  const parsed = parseColor(value);
  if (parsed === undefined) {
    throw new Error(`Not a colour: ${value}`);
  }
  return parsed;
}

describe("parseColor", () => {
  test("reads hex colours", () => {
    expect(parseColor("#fff")).toEqual(WHITE);
    expect(parseColor("#f5efe3")).toEqual({ r: 245, g: 239, b: 227, a: 1 });
    expect(parseColor("#000000ff")).toEqual(BLACK);
    expect(parseColor("#00000080")?.a).toBeCloseTo(0.5, 2);
  });

  test("reads rgb() and rgba(), with commas or spaces", () => {
    expect(parseColor("rgb(255, 255, 255)")).toEqual(WHITE);
    expect(parseColor("rgba(0, 0, 0, 0.08)")).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0.08,
    });
    expect(parseColor("rgb(0 0 0 / 50%)")?.a).toBe(0.5);
  });

  test("reads a value that Prettier broke over several lines", () => {
    expect(
      parseColor("rgba(\n    255,\n    255,\n    255,\n    0.22\n  )"),
    ).toEqual({ r: 255, g: 255, b: 255, a: 0.22 });
  });

  test("does not guess what it cannot read", () => {
    expect(parseColor("color-mix(in srgb, #fff 50%, #000)")).toBeUndefined();
    expect(parseColor("var(--ink)")).toBeUndefined();
    expect(parseColor("#12")).toBeUndefined();
    expect(parseColor("rgb(1, 2)")).toBeUndefined();
    expect(parseColor("red")).toBeUndefined();
  });
});

describe("contrast ratio", () => {
  test("matches the values of the WCAG definition", () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 6);
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 6);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
    // A well known pair: #767676 on white is just over 4.5:1.
    expect(contrastRatio(color("#767676"), WHITE)).toBeCloseTo(4.54, 2);
    expect(contrastRatio(color("#777777"), WHITE)).toBeCloseTo(4.48, 2);
  });

  test("is the same either way round", () => {
    const a = color("#a1122a");
    const b = color("#f5efe3");
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });

  test("refuses a translucent colour", () => {
    expect(() => contrastRatio(color("rgba(0, 0, 0, 0.5)"), WHITE)).toThrow();
  });
});

describe("compositing", () => {
  test("paints a translucent colour over another", () => {
    expect(compositeOver(color("rgba(0, 0, 0, 0.5)"), WHITE)).toEqual({
      r: 127.5,
      g: 127.5,
      b: 127.5,
      a: 1,
    });
    expect(compositeOver(color("#102030"), WHITE)).toEqual(color("#102030"));
  });

  test("stacks several layers, bottom first", () => {
    const result = compositeLayers([
      WHITE,
      color("rgba(0, 0, 0, 0.5)"),
      color("rgba(255, 255, 255, 0.5)"),
    ]);
    expect(result.r).toBeCloseTo(191.25, 6);
  });

  test("needs an opaque bottom layer", () => {
    expect(() => compositeLayers([color("rgba(0, 0, 0, 0.5)")])).toThrow();
    expect(() => compositeLayers([])).toThrow();
  });
});

describe("parseTokenSets", () => {
  const CSS = `
    /* comment with { braces } */
    :root { color-scheme: light; --a: #fff; --b: rgba(0, 0, 0, 0.5); --font: "X", sans-serif; }
    [data-theme="dark"] { --a: #000; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme]) { --a: #000; }
    }`;

  test("finds the three blocks", () => {
    const sets = parseTokenSets(CSS);
    expect(sets.light.get("a")).toBe("#fff");
    expect(sets.light.get("b")).toBe("rgba(0, 0, 0, 0.5)");
    expect(sets.dark.get("a")).toBe("#000");
    expect(sets.darkAuto.get("a")).toBe("#000");
  });

  test("ignores a block that is missing", () => {
    expect(() => parseTokenSets(":root { --a: #fff; }")).toThrow(
      "[data-theme=",
    );
  });
});

describe("the tokens in tokens.css", () => {
  const sets = parseTokenSets(
    readFileSync(
      path.join(import.meta.dirname, "..", "static", "css", "tokens.css"),
      "utf8",
    ),
  );

  test("keep the dark colours identical in both copies", () => {
    expect(Object.fromEntries(sets.darkAuto)).toEqual(
      Object.fromEntries(sets.dark),
    );
  });

  test("define every colour in both themes", () => {
    for (const name of ["bg", "surface", "ink", "ink-2", "accent", "scrim"]) {
      expect(sets.light.has(name)).toBe(true);
      expect(sets.dark.has(name)).toBe(true);
    }
  });

  test.each([
    ["light", sets.light],
    ["dark", sets.dark],
  ])("keep the main text readable (%s)", (_theme, tokens) => {
    const get = (name: string) => color(tokens.get(name) ?? "");
    expect(contrastRatio(get("ink"), get("bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(get("ink-2"), get("surface"))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrastRatio(get("on-accent"), get("accent")),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
