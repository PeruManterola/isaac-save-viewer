// Inline SVG icons for the interface (never emoji). They are drawn with `currentColor`, so they
// take the colour of the text around them. The `.i` class in "base.css" sizes and strokes them.

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type Shape = readonly [
  tag: "path" | "rect" | "circle",
  attributes: Readonly<Record<string, string>>,
];

const path = (d: string): Shape => ["path", { d }];

const ICONS = {
  upload: [
    path("M12 16V4M7 9l5-5 5 5"),
    path("M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"),
  ],
  file: [
    path("M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"),
    path("M14 3v5h5"),
  ],
  copy: [
    ["rect", { x: "9", y: "9", width: "11", height: "11", rx: "2" }],
    path("M5 15V6a2 2 0 0 1 2-2h9"),
  ],
  check: [path("M5 12.5l4.5 4.5L19 7.5")],
  lock: [
    ["rect", { x: "5", y: "11", width: "14", height: "10", rx: "2" }],
    path("M8 11V8a4 4 0 0 1 8 0v3"),
  ],
  chevron: [path("M6 9l6 6 6-6")],
  "arrow-down": [path("M12 5v14M6 13l6 6 6-6")],
  "external-link": [
    path("M14 4h6v6M20 4l-9 9"),
    path("M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"),
  ],
  shield: [
    path("M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"),
    path("M9 12l2 2 4-4"),
  ],
  alert: [
    ["circle", { cx: "12", cy: "12", r: "9" }],
    path("M12 7v6M12 16.5v.5"),
  ],
  grid: [
    ["rect", { x: "4", y: "4", width: "7", height: "7", rx: "1.5" }],
    ["rect", { x: "13", y: "4", width: "7", height: "7", rx: "1.5" }],
    ["rect", { x: "4", y: "13", width: "7", height: "7", rx: "1.5" }],
    ["rect", { x: "13", y: "13", width: "7", height: "7", rx: "1.5" }],
  ],
  list: [
    path("M9 6h11M9 12h11M9 18h11"),
    ["circle", { cx: "4.5", cy: "6", r: "1" }],
    ["circle", { cx: "4.5", cy: "12", r: "1" }],
    ["circle", { cx: "4.5", cy: "18", r: "1" }],
  ],
  close: [path("M6 6l12 12M18 6L6 18")],
  /** A dashed circle: "not done yet". */
  ring: [
    ["circle", { cx: "12", cy: "12", r: "8", "stroke-dasharray": "3.2 3.2" }],
  ],
  trophy: [
    path("M7 4h10v5a5 5 0 0 1-10 0z"),
    path("M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"),
  ],
  /** The "follow the system" theme. */
  monitor: [
    ["rect", { x: "3", y: "4", width: "18", height: "12", rx: "2" }],
    path("M8 20h8M12 16v4"),
  ],
  sun: [
    ["circle", { cx: "12", cy: "12", r: "4" }],
    path(
      "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4",
    ),
  ],
  moon: [path("M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z")],
  search: [
    ["circle", { cx: "11", cy: "11", r: "6.5" }],
    path("M16 16l4.5 4.5"),
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

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
