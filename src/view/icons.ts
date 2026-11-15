// Inline SVG icons for the interface (never emoji), from Tabler Icons (https://tabler.io/icons).
// "src/data/icons.json" holds only the icons that are used; run `npm run data:icons` to add one
// (the list is in "scripts/generate-icons.ts"). They are drawn with `currentColor`, so they take
// the colour of the text around them. The `.i` class in "base.css" sizes and strokes them.

import iconsJSON from "../data/icons.json";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export type IconName = keyof typeof iconsJSON;

/** An SVG element and its attributes. TypeScript infers JSON tuples as arrays, so we cast. */
type Shape = readonly [
  tag: string,
  attributes: Readonly<Record<string, string>>,
];

const ICONS = iconsJSON as unknown as Readonly<
  Record<IconName, readonly Shape[]>
>;

/** Creates a decorative icon. Put the accessible name on the button or text next to it. */
export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", "i");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  for (const [tag, attributes] of ICONS[name]) {
    const shape = document.createElementNS(SVG_NAMESPACE, tag);
    for (const [attributeName, value] of Object.entries(attributes)) {
      shape.setAttribute(attributeName, value);
    }
    svg.append(shape);
  }

  return svg;
}
