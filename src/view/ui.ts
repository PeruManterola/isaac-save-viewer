// Builders for the shared interface primitives. Their CSS is in "static/css/base.css". Every
// builder returns a plain element, so callers can add classes or listeners to it.

import { h } from "./dom.js";
import type { IconName } from "./icons.js";
import { icon } from "./icons.js";

type Child = Node | string;

interface ButtonOptions {
  /** The text of the button. For an icon-only button it is the accessible name. */
  readonly label: string;
  readonly variant?: "primary" | "ghost";
  readonly large?: boolean;
  readonly icon?: IconName;
  /** Shows only the icon, and the label as a tooltip and accessible name. */
  readonly iconOnly?: boolean;
  readonly onClick?: () => void;
}

export function button(options: ButtonOptions): HTMLButtonElement {
  const classes = ["btn", `btn-${options.variant ?? "ghost"}`];
  if (options.large === true) {
    classes.push("btn-lg");
  }
  if (options.iconOnly === true) {
    classes.push("btn-icon");
  }

  const children: Child[] = [];
  if (options.icon !== undefined) {
    children.push(icon(options.icon));
  }

  const attributes: Record<string, string> = {
    type: "button",
    class: classes.join(" "),
  };
  if (options.iconOnly === true) {
    attributes["aria-label"] = options.label;
    attributes["title"] = options.label;
  } else {
    children.push(options.label);
  }

  const element = h("button", attributes, children);
  const { onClick } = options;
  if (onClick !== undefined) {
    element.addEventListener("click", onClick);
  }

  return element;
}

/**
 * "ok" is complete, "locked" is locked or not done, and "need" is something that is still to do.
 * The state is always in the text, never in the colour alone.
 */
type BadgeKind = "ok" | "locked" | "need";

export function badge(
  kind: BadgeKind,
  text: string,
  iconName?: IconName,
): HTMLSpanElement {
  return h("span", { class: `badge ${kind}` }, [
    ...(iconName === undefined ? [] : [icon(iconName)]),
    text,
  ]);
}

interface ProgressBarOptions {
  readonly value: number;
  readonly max: number;
  /** What the bar measures, e.g. "Achievements progress". */
  readonly label: string;
  readonly thin?: boolean;
}

export function progressBar(options: ProgressBarOptions): HTMLDivElement {
  const { value, max, label } = options;
  const fill = h("i");
  fill.style.width = `${max === 0 ? 0 : Math.min(100, (value / max) * 100).toFixed(1)}%`;

  return h(
    "div",
    {
      class: options.thin === true ? "bar thin" : "bar",
      role: "progressbar",
      "aria-label": label,
      "aria-valuemin": "0",
      "aria-valuemax": max.toString(),
      "aria-valuenow": value.toString(),
      "aria-valuetext": `${value} of ${max}`,
    },
    [fill],
  );
}

export function card(
  children: readonly Child[],
  className = "",
): HTMLDivElement {
  return h("div", { class: `card ${className}`.trim() }, children);
}

/**
 * - "pressed": a group of toggle buttons with `aria-pressed`, e.g. a filter. The arrow keys move
 *   the focus, and Enter or Space selects.
 * - "radio": a radio group (e.g. the theme). The arrow keys move the focus and select.
 * - "tab": a tab list. The arrow keys move the focus and select. Give each option an `id` and the
 *   `controls` ID of its panel.
 */
type SegmentedKind = "pressed" | "radio" | "tab";

interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
  /** Shown as a small count next to the label. */
  readonly count?: number;
  /** The ID of the button. Needed for tabs. */
  readonly id?: string;
  /** The ID of the panel that the tab shows. */
  readonly controls?: string;
}

interface SegmentedConfig<T extends string> {
  /** The accessible name of the whole control. */
  readonly label: string;
  readonly kind: SegmentedKind;
  readonly options: ReadonlyArray<SegmentedOption<T>>;
  readonly value: T;
  /** Called when the user selects a different option. */
  readonly onChange: (value: T) => void;
  /** Shows only the icons. The labels become tooltips and accessible names. */
  readonly iconOnly?: boolean;
  readonly className?: string;
}

interface Segmented<T extends string> {
  readonly element: HTMLDivElement;
  /** Changes the selected option without calling `onChange`. */
  readonly select: (value: T) => void;
}

const CONTAINER_ROLES = {
  pressed: "group",
  radio: "radiogroup",
  tab: "tablist",
} as const satisfies Record<SegmentedKind, string>;

const BUTTON_ROLES = {
  pressed: undefined,
  radio: "radio",
  tab: "tab",
} as const satisfies Record<SegmentedKind, string | undefined>;

const SELECTED_ATTRIBUTES = {
  pressed: "aria-pressed",
  radio: "aria-checked",
  tab: "aria-selected",
} as const satisfies Record<SegmentedKind, string>;

/**
 * Which button the arrow, Home, or End key moves to, or undefined for any other key.
 *
 * @param key The `key` of the keyboard event.
 * @param index The index of the button that has the focus.
 * @param count How many buttons there are.
 */
export function nextSegmentIndex(
  key: string,
  index: number,
  count: number,
): number | undefined {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown": {
      return (index + 1) % count;
    }

    case "ArrowLeft":
    case "ArrowUp": {
      return (index - 1 + count) % count;
    }

    case "Home": {
      return 0;
    }

    case "End": {
      return count - 1;
    }

    default: {
      return undefined;
    }
  }
}

export function segmented<T extends string>(
  config: SegmentedConfig<T>,
): Segmented<T> {
  const { kind, options, iconOnly = false } = config;
  const buttonRole = BUTTON_ROLES[kind];
  const selectedAttribute = SELECTED_ATTRIBUTES[kind];
  const roving = kind !== "pressed";
  let current = config.value;

  const buttons = options.map((option) => {
    const attributes: Record<string, string> = { type: "button" };
    if (buttonRole !== undefined) {
      attributes["role"] = buttonRole;
    }
    if (option.id !== undefined) {
      attributes["id"] = option.id;
    }
    if (option.controls !== undefined) {
      attributes["aria-controls"] = option.controls;
    }
    if (iconOnly) {
      attributes["title"] = option.label;
    }

    const children: Child[] = [];
    if (option.icon !== undefined) {
      children.push(icon(option.icon));
    }
    children.push(h("span", iconOnly ? { class: "sr" } : {}, [option.label]));
    if (option.count !== undefined) {
      children.push(h("span", { class: "n" }, [option.count.toString()]));
    }

    return h("button", attributes, children);
  });

  function select(value: T) {
    current = value;
    for (const [index, element] of buttons.entries()) {
      const selected = options[index]?.value === value;
      element.setAttribute(selectedAttribute, selected.toString());
      if (roving) {
        element.tabIndex = selected ? 0 : -1;
      }
    }
  }

  function choose(value: T) {
    if (value !== current) {
      select(value);
      config.onChange(value);
    }
  }

  for (const [index, element] of buttons.entries()) {
    element.addEventListener("click", () => {
      const option = options[index];
      if (option !== undefined) {
        choose(option.value);
      }
    });
  }

  const element = h(
    "div",
    {
      class: ["seg", iconOnly ? "seg-icons" : "", config.className ?? ""]
        .filter((name) => name !== "")
        .join(" "),
      role: CONTAINER_ROLES[kind],
      "aria-label": config.label,
    },
    buttons,
  );

  element.addEventListener("keydown", (event) => {
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const next =
      index === -1
        ? undefined
        : nextSegmentIndex(event.key, index, buttons.length);
    const target = next === undefined ? undefined : buttons[next];
    if (next === undefined || target === undefined) {
      return;
    }

    event.preventDefault();
    target.focus();
    const option = options[next];
    if (roving && option !== undefined) {
      choose(option.value);
    }
  });

  select(config.value);

  return { element, select };
}
