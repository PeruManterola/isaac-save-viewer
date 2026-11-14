// What the achievements and items sections share: one entry model, the builders for a wall tile and
// a list row, and the click handling that opens the detail popover. Every node is built once and
// then shown or hidden, so changing the filter or the search never rebuilds anything.

import { h, lazyImage } from "./dom.js";
import type { DetailContent } from "./popover.js";
import { closeDetail, isDetailOpenFor, openDetail } from "./popover.js";
import { badge } from "./ui.js";

const TILE_ICON_SIZE = 64;
const ROW_ICON_SIZE = 32;

/** Something that is shown as a tile or a row: an achievement or an item. */
export interface DisplayEntry {
  readonly id: number;
  readonly name: string;
  readonly unlocked: boolean;
  /** The path of the icon, if there is one. */
  readonly icon: string | undefined;
  /** What the status is called, in lower case, for the accessible name. E.g. "not touched". */
  readonly stateWord: string;
  /** What the status badge says. E.g. "Not touched". */
  readonly statusText: string;
  /** The second line of a list row: the unlock requirement or the pools. */
  readonly secondary: string;
  /** Built with `buildSearchText`. */
  readonly searchText: string;
  readonly detail: () => DetailContent;
  /** Whether the entry passes the filter and the search. Set by the section. */
  matches: boolean;
  /** Every node that was built for the entry (a tile and/or a row). */
  readonly nodes: HTMLElement[];
}

const entryByNode = new WeakMap<Element, DisplayEntry>();

function register(entry: DisplayEntry, node: HTMLElement) {
  entry.nodes.push(node);
  entryByNode.set(node, entry);
}

/** Shows the nodes of the entries that match, and hides the others. */
export function syncVisibility(entries: readonly DisplayEntry[]): void {
  for (const entry of entries) {
    for (const node of entry.nodes) {
      if (node.hidden === entry.matches) {
        node.hidden = !entry.matches;
      }
    }
  }
}

function entryImage(
  entry: DisplayEntry,
  size: number,
): HTMLImageElement | HTMLSpanElement {
  return entry.icon === undefined
    ? h("span", { class: "px-missing", "aria-hidden": "true" }, ["?"])
    : lazyImage(entry.icon, "", size, "px");
}

const POPUP_ATTRIBUTES = {
  type: "button",
  "aria-haspopup": "dialog",
  "aria-expanded": "false",
} as const;

/** A square tile with only an icon. It is a button that opens the details. */
function createTile(entry: DisplayEntry): HTMLButtonElement {
  const children: Node[] = [entryImage(entry, TILE_ICON_SIZE)];
  const tile = h(
    "button",
    {
      ...POPUP_ATTRIBUTES,
      class: entry.unlocked ? "tile" : "tile is-locked",
      "aria-label": `${entry.name}, ${entry.stateWord}`,
    },
    children,
  );
  register(entry, tile);

  return tile;
}

/** The wall: dense tiles, one per entry. */
export function createWall(
  entries: readonly DisplayEntry[],
  label: string,
): HTMLElement {
  return h(
    "div",
    { class: "wall", role: "group", "aria-label": label },
    entries.map((entry) => createTile(entry)),
  );
}

function createRow(entry: DisplayEntry): HTMLLIElement {
  const button = h("button", { ...POPUP_ATTRIBUTES, class: "row-btn" }, [
    h("span", { class: entry.unlocked ? "ric" : "ric is-locked" }, [
      entryImage(entry, ROW_ICON_SIZE),
    ]),
    h("span", { class: "row-text" }, [
      h("span", { class: "nm" }, [entry.name]),
      h("span", { class: "id" }, [`#${entry.id}`]),
      h("span", { class: "req" }, [entry.secondary]),
    ]),
    entry.unlocked
      ? badge("ok", entry.statusText, "check")
      : badge("locked", entry.statusText, "lock"),
  ]);
  const row = h("li", { class: "row-li" }, [button]);
  // The button is what the user selects, and the row is what is hidden.
  entryByNode.set(button, entry);
  register(entry, row);

  return row;
}

/** The list: compact rows. */
export function createRows(
  entries: readonly DisplayEntry[],
  label: string,
): HTMLElement {
  return h(
    "ul",
    { class: "rows", "aria-label": label },
    entries.map((entry) => createRow(entry)),
  );
}

/**
 * A card with the name visible, for an item that is still to touch. It is not a button, because
 * everything that the popover would say is already on the card.
 */
export function createWantCard(entry: DisplayEntry): HTMLLIElement {
  const card = h("li", { class: "want" }, [
    h("span", { class: "tile" }, [entryImage(entry, TILE_ICON_SIZE)]),
    h("div", { class: "want-text" }, [
      h("p", { class: "want-name" }, [entry.name]),
      h("p", { class: "id" }, [`#${entry.id}`]),
      h("p", { class: "pool" }, [entry.secondary]),
    ]),
  ]);
  register(entry, card);

  return card;
}

/** Opens the detail popover when a tile or row inside the root is selected. */
export function enableDetails(root: HTMLElement): void {
  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest("button[aria-haspopup]");
    const entry = button === null ? undefined : entryByNode.get(button);
    if (
      button === null
      || entry === undefined
      || !(button instanceof HTMLElement)
    ) {
      return;
    }

    if (isDetailOpenFor(button)) {
      closeDetail(true);
    } else {
      openDetail(button, entry.detail());
    }
  });
}
