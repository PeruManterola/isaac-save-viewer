// The maths behind "scripts/check-contrast.ts": reading the colour tokens out of
// "static/css/tokens.css", and the WCAG 2.x contrast ratio. It has no dependencies, so that a test
// can import it.

// https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance

// cspell:words rrggbb rrggbbaa

export interface Color {
  /** 0 to 255. */
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0 (transparent) to 1 (opaque). */
  readonly a: number;
}

interface TokenSets {
  /** The `:root` block: the light theme. */
  readonly light: ReadonlyMap<string, string>;
  /** The `[data-theme="dark"]` block: the dark theme, when the user forces it. */
  readonly dark: ReadonlyMap<string, string>;
  /** The `:root:not([data-theme])` block in the dark media query: the dark theme, from the OS. */
  readonly darkAuto: ReadonlyMap<string, string>;
}

const HEX_PATTERN = /^#(?<digits>[\da-f]{3,8})$/i;
const FUNCTION_PATTERN = /^rgba?\((?<args>[^()]*)\)$/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHex(digits: string): Color | undefined {
  // "#rgb" and "#rgba" repeat each digit.
  const full =
    digits.length === 3 || digits.length === 4
      ? digits.replaceAll(/./g, "$&$&")
      : digits;
  if (full.length !== 6 && full.length !== 8) {
    return undefined;
  }

  const byte = (index: number) =>
    Number.parseInt(full.slice(index * 2, index * 2 + 2), 16);
  return {
    r: byte(0),
    g: byte(1),
    b: byte(2),
    a: full.length === 8 ? byte(3) / 255 : 1,
  };
}

function parseChannel(text: string): number | undefined {
  const value = Number.parseFloat(text);
  if (Number.isNaN(value)) {
    return undefined;
  }

  return clamp(text.endsWith("%") ? (value / 100) * 255 : value, 0, 255);
}

function parseAlpha(text: string): number | undefined {
  const value = Number.parseFloat(text);
  if (Number.isNaN(value)) {
    return undefined;
  }

  return clamp(text.endsWith("%") ? value / 100 : value, 0, 1);
}

/**
 * Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgba(...)` (with commas or
 * spaces). Returns undefined for anything else, such as `color-mix()` or `var()`, so that the
 * caller can say that it did not check it.
 */
export function parseColor(value: string): Color | undefined {
  const text = value.trim();

  const hex = HEX_PATTERN.exec(text)?.groups?.["digits"];
  if (hex !== undefined) {
    return parseHex(hex);
  }

  const args = FUNCTION_PATTERN.exec(text)?.groups?.["args"];
  if (args !== undefined) {
    const parts = args.split(/[\s,/]+/).filter((part) => part !== "");
    if (parts.length !== 3 && parts.length !== 4) {
      return undefined;
    }

    const [r, g, b] = parts.slice(0, 3).map((part) => parseChannel(part));
    const a = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    if (
      r === undefined
      || g === undefined
      || b === undefined
      || a === undefined
    ) {
      return undefined;
    }

    return { r, g, b, a };
  }

  return undefined;
}

/** The colour that results from painting `top` over `bottom` (which must be opaque). */
export function compositeOver(top: Color, bottom: Color): Color {
  const mix = (topChannel: number, bottomChannel: number) =>
    topChannel * top.a + bottomChannel * (1 - top.a);

  return {
    r: mix(top.r, bottom.r),
    g: mix(top.g, bottom.g),
    b: mix(top.b, bottom.b),
    a: 1,
  };
}

/** Paints the layers on top of each other (the first one is the bottom, and must be opaque). */
export function compositeLayers(layers: readonly Color[]): Color {
  const [first, ...rest] = layers;
  if (first === undefined || first.a !== 1) {
    throw new Error("The bottom layer must be opaque.");
  }

  let result = first;
  for (const layer of rest) {
    result = compositeOver(layer, result);
  }

  return result;
}

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Color): number {
  return (
    0.2126 * linearize(color.r)
    + 0.7152 * linearize(color.g)
    + 0.0722 * linearize(color.b)
  );
}

/** From 1 to 21. Both colours must be opaque. */
export function contrastRatio(foreground: Color, background: Color): number {
  if (foreground.a !== 1 || background.a !== 1) {
    throw new Error("Composite translucent colours before comparing them.");
  }

  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function parseDeclarations(body: string): ReadonlyMap<string, string> {
  const tokens = new Map<string, string>();
  for (const declaration of body.split(";")) {
    const match = /^\s*--(?<name>[\w-]+)\s*:(?<value>[\S\s]+)$/.exec(
      declaration,
    );
    const { name, value } = match?.groups ?? {};
    if (name !== undefined && value !== undefined) {
      tokens.set(name, value.replaceAll(/\s+/g, " ").trim());
    }
  }

  return tokens;
}

/** Reads the three blocks of custom properties out of the text of "tokens.css". */
export function parseTokenSets(css: string): TokenSets {
  const withoutComments = css.replaceAll(/\/\*[\S\s]*?\*\//g, "");

  const blocks = new Map<string, ReadonlyMap<string, string>>();
  for (const match of withoutComments.matchAll(/([^{}]+){([^{}]*)}/g)) {
    const selector = (match[1] ?? "").replaceAll(/\s+/g, " ").trim();
    blocks.set(selector, parseDeclarations(match[2] ?? ""));
  }

  const get = (selector: string) => {
    const block = blocks.get(selector);
    if (block === undefined) {
      throw new Error(`There is no "${selector}" block in the tokens.`);
    }
    return block;
  };

  return {
    light: get(":root"),
    dark: get('[data-theme="dark"]'),
    darkAuto: get(":root:not([data-theme])"),
  };
}
