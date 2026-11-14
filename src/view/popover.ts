// The one detail popover that is shared by every achievement and item. It replaces the old hover
// tooltips: nothing here needs hover. It opens when a tile or row is selected, stays inside the
// window, flips above the tile when there is no room below, and becomes a bottom sheet on narrow
// screens. The popover is a child of the closest ".pop-host" so that the keyboard order and the
// scrolling stay natural.

import { h, lazyImage } from "./dom.js";
import { icon } from "./icons.js";
import { badge } from "./ui.js";

const POPOVER_ID = "detail-popover";
const TITLE_ID = "detail-popover-title";
const POPOVER_WIDTH_PX = 320;
const WINDOW_MARGIN_PX = 8;
const GAP_PX = 12;
const ARROW_SIZE_PX = 14;
const ARROW_EDGE_PX = 18;
/** Anchors wider than this (list rows) point at their icon, not at their middle. */
const WIDE_ANCHOR_PX = 120;
const WIDE_ANCHOR_ARROW_X_PX = 28;
const ICON_SIZE_PX = 64;
const SHEET_MEDIA_QUERY = "(max-width: 480px)";

export interface DetailContent {
  readonly name: string;
  /** For example, "#12 - Challenges". */
  readonly subtitle: string;
  /** The path of the icon, if there is one. */
  readonly icon: string | undefined;
  readonly unlocked: boolean;
  /** For example, "Unlocked" or "Not touched". */
  readonly statusText: string;
  /** Fields with no text are left out. */
  readonly fields: ReadonlyArray<{
    readonly label: string;
    readonly text: string;
  }>;
  /** A link that opens in a new tab. */
  readonly link?: { readonly href: string; readonly text: string };
}

interface OpenPopover {
  readonly anchor: HTMLElement;
  readonly element: HTMLElement;
  readonly arrow: HTMLElement;
  readonly host: HTMLElement;
}

let current: OpenPopover | undefined;
let listenersAdded = false;
let sheetQuery: MediaQueryList | undefined;
let repositionFrame: number | undefined;

export function isDetailOpenFor(anchor: Element): boolean {
  return current?.anchor === anchor;
}

/**
 * Opens the popover for the anchor (a tile or a row) and moves the focus into it. If it was open
 * for another anchor, that one is closed first.
 */
export function openDetail(anchor: HTMLElement, content: DetailContent): void {
  closeDetail(false);
  addListeners();

  const host = anchor.closest<HTMLElement>(".pop-host") ?? document.body;
  const { element, arrow } = buildPopover(content);
  host.append(element);
  anchor.setAttribute("aria-expanded", "true");
  anchor.setAttribute("aria-controls", POPOVER_ID);
  anchor.classList.add("is-sel");
  current = { anchor, element, arrow, host };

  position();
  element.focus();
}

/**
 * @param restoreFocus Move the focus back to the tile or row. Do this when the user closes the
 *                     popover with the keyboard or its button, but not when they click elsewhere.
 */
export function closeDetail(restoreFocus: boolean): void {
  if (current === undefined) {
    return;
  }

  const { anchor, element } = current;
  current = undefined;
  element.remove();
  anchor.setAttribute("aria-expanded", "false");
  anchor.removeAttribute("aria-controls");
  anchor.classList.remove("is-sel");
  if (restoreFocus && anchor.isConnected) {
    anchor.focus();
  }
}

function buildPopover(content: DetailContent): {
  element: HTMLElement;
  arrow: HTMLElement;
} {
  const arrow = h("span", { class: "pop-arrow", "aria-hidden": "true" });
  const closeButton = h(
    "button",
    { type: "button", class: "pop-x", "aria-label": "Close details" },
    [icon("close")],
  );
  closeButton.addEventListener("click", () => {
    closeDetail(true);
  });

  const headChildren: Node[] = [];
  if (content.icon !== undefined) {
    headChildren.push(
      h("span", { class: content.unlocked ? "pop-ic" : "pop-ic is-locked" }, [
        lazyImage(content.icon, "", ICON_SIZE_PX, "px"),
      ]),
    );
  }

  const status = content.unlocked
    ? badge("ok", content.statusText, "check")
    : badge("locked", content.statusText, "lock");
  headChildren.push(
    h("div", { class: "pop-title" }, [
      h("h4", { id: TITLE_ID }, [content.name]),
      h("p", { class: "small muted" }, [content.subtitle]),
      status,
    ]),
    closeButton,
  );

  const children: Node[] = [
    arrow,
    h("div", { class: "pop-head" }, headChildren),
  ];
  const fields = content.fields.filter((field) => field.text !== "");
  if (fields.length > 0) {
    children.push(
      h(
        "dl",
        {},
        fields.map((field) =>
          h("div", {}, [h("dt", {}, [field.label]), h("dd", {}, [field.text])]),
        ),
      ),
    );
  }

  if (content.link !== undefined) {
    children.push(
      h(
        "a",
        {
          class: "link",
          href: content.link.href,
          target: "_blank",
          rel: "noopener",
        },
        [
          content.link.text,
          h("span", { class: "sr" }, [" (opens in a new tab)"]),
          icon("external-link"),
        ],
      ),
    );
  }

  const element = h(
    "div",
    {
      id: POPOVER_ID,
      class: "pop",
      role: "dialog",
      "aria-labelledby": TITLE_ID,
      tabindex: "-1",
    },
    children,
  );

  // Tabbing out of the popover closes it. (When the focus moves to nothing, e.g. a click on empty
  // space, the click handler does it.)
  element.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (
      next instanceof Node
      && current !== undefined
      && !element.contains(next)
      && next !== current.anchor
    ) {
      closeDetail(false);
    }
  });

  return { element, arrow };
}

function addListeners() {
  if (listenersAdded) {
    return;
  }
  listenersAdded = true;

  document.addEventListener("click", (event) => {
    if (current === undefined) {
      return;
    }

    const target = event.target as Node;
    if (!current.element.contains(target) && !current.anchor.contains(target)) {
      closeDetail(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && current !== undefined) {
      event.preventDefault();
      closeDetail(true);
    }
  });

  window.addEventListener("resize", () => {
    repositionFrame ??= requestAnimationFrame(() => {
      repositionFrame = undefined;
      position();
    });
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Places the popover next to its anchor, or as a bottom sheet on narrow screens. */
function position() {
  if (current === undefined) {
    return;
  }

  const { anchor, element, arrow, host } = current;
  sheetQuery ??= globalThis.matchMedia(SHEET_MEDIA_QUERY);
  const sheet = sheetQuery.matches;
  element.classList.toggle("is-sheet", sheet);

  if (sheet) {
    element.style.removeProperty("left");
    element.style.removeProperty("top");
    element.style.removeProperty("width");
    revealAnchorAboveSheet(anchor, element);
    return;
  }

  const viewportWidth = document.documentElement.clientWidth;
  const anchorRect = anchor.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const width = Math.min(
    POPOVER_WIDTH_PX,
    viewportWidth - 2 * WINDOW_MARGIN_PX,
  );
  element.style.width = `${width}px`;
  const height = element.offsetHeight;

  const centerX =
    anchorRect.width > WIDE_ANCHOR_PX
      ? anchorRect.left + WIDE_ANCHOR_ARROW_X_PX
      : anchorRect.left + anchorRect.width / 2;
  const left = clamp(
    centerX - width / 2,
    WINDOW_MARGIN_PX,
    viewportWidth - width - WINDOW_MARGIN_PX,
  );

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  const above = spaceBelow < height + GAP_PX && spaceAbove > spaceBelow;
  const top = above
    ? anchorRect.top - GAP_PX - height
    : anchorRect.bottom + GAP_PX;

  // The popover is positioned inside the padding box of the host.
  element.style.left = `${left - hostRect.left - host.clientLeft}px`;
  element.style.top = `${top - hostRect.top - host.clientTop}px`;
  element.dataset["side"] = above ? "above" : "below";
  arrow.style.left = `${clamp(
    centerX - left - ARROW_SIZE_PX / 2,
    ARROW_EDGE_PX,
    width - ARROW_EDGE_PX - ARROW_SIZE_PX,
  )}px`;
}

/** The bottom sheet covers the lower part of the window, so scroll the tile out from under it. */
function revealAnchorAboveSheet(anchor: HTMLElement, sheet: HTMLElement) {
  const overlap =
    anchor.getBoundingClientRect().bottom
    - sheet.getBoundingClientRect().top
    + WINDOW_MARGIN_PX;
  if (overlap > 0) {
    window.scrollBy(0, overlap);
  }
}
