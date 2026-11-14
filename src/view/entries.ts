// Renders a list of achievements or items as a table (list view) or as tiles (grid view).

import type { Filter, ViewMode } from "../state/filter.js";
import { filterEntries } from "../state/filter.js";
import { h, lazyImage } from "./dom.js";
import { badge } from "./ui.js";

const ICON_SIZE = 64;

interface Column<T> {
  readonly header: string;
  readonly cell: (entry: T) => Node | string;
  readonly className?: string;
}

/** Describes how to show one kind of entry. */
export interface EntryRenderer<T> {
  readonly columns: ReadonlyArray<Column<T>>;
  /** The description of a tile in grid view, shown on hover, focus, or tap. */
  readonly tooltip: (entry: T) => readonly Node[];
  readonly name: (entry: T) => string;
  readonly icon: (entry: T) => string | undefined;
  /** For example, "Unlocked" or "Touched". */
  readonly unlockedText: string;
  /** For example, "Locked" or "Not touched". */
  readonly lockedText: string;
  /** The plural noun, for example "achievements". */
  readonly noun: string;
}

interface Entry {
  readonly id: number;
  readonly unlocked: boolean;
}

export function renderEntries<T extends Entry>(
  entries: readonly T[],
  renderer: EntryRenderer<T>,
  viewMode: ViewMode,
  filter: Filter,
): HTMLElement {
  const filteredEntries = filterEntries(entries, filter);
  if (filteredEntries.length === 0) {
    return h("p", { class: "isv-empty" }, [getEmptyText(renderer, filter)]);
  }

  return viewMode === "list"
    ? renderList(filteredEntries, renderer)
    : renderGrid(filteredEntries, renderer);
}

function statusTag(
  unlocked: boolean,
  renderer: Pick<EntryRenderer<never>, "unlockedText" | "lockedText">,
): HTMLElement {
  return unlocked
    ? badge("ok", renderer.unlockedText, "check")
    : badge("locked", renderer.lockedText, "lock");
}

function getEmptyText<T>(renderer: EntryRenderer<T>, filter: Filter): string {
  switch (filter) {
    case "all": {
      return `There are no ${renderer.noun}.`;
    }

    case "locked": {
      return `There are no ${renderer.lockedText.toLowerCase()} ${renderer.noun}.`;
    }

    case "unlocked": {
      return `There are no ${renderer.unlockedText.toLowerCase()} ${renderer.noun} yet.`;
    }
  }
}

function renderList<T extends Entry>(
  entries: readonly T[],
  renderer: EntryRenderer<T>,
): HTMLElement {
  const headers = [
    "ID",
    "Status",
    ...renderer.columns.map((column) => column.header),
  ];
  const head = h("thead", {}, [
    h(
      "tr",
      {},
      headers.map((header) => h("th", {}, [header])),
    ),
  ]);
  const rows = entries.map((entry) =>
    h("tr", { class: entry.unlocked ? "" : "isv-locked" }, [
      h("td", {}, [entry.id.toString()]),
      h("td", {}, [statusTag(entry.unlocked, renderer)]),
      ...renderer.columns.map((column) =>
        h(
          "td",
          column.className === undefined ? {} : { class: column.className },
          [column.cell(entry)],
        ),
      ),
    ]),
  );

  return h("div", { class: "isv-table-wrap" }, [
    h("table", { class: "isv-list" }, [head, h("tbody", {}, rows)]),
  ]);
}

function renderGrid<T extends Entry>(
  entries: readonly T[],
  renderer: EntryRenderer<T>,
): HTMLElement {
  const tiles = entries.map((entry) => {
    const name = renderer.name(entry);
    const icon = renderer.icon(entry);
    const tooltipID = `isv-tooltip-${renderer.noun}-${entry.id}`;

    const tooltip = h(
      "div",
      { class: "isv-tooltip", role: "tooltip", id: tooltipID },
      [
        h("p", { class: "isv-tooltip-title" }, [`${entry.id}. ${name}`]),
        h("p", {}, [statusTag(entry.unlocked, renderer)]),
        ...renderer.tooltip(entry),
      ],
    );

    return h(
      "div",
      {
        class: entry.unlocked ? "isv-tile" : "isv-tile isv-locked",
        tabindex: "0",
        "aria-describedby": tooltipID,
      },
      [
        h("div", { class: "isv-tile-icon" }, [
          icon === undefined ? "" : lazyImage(icon, "", ICON_SIZE),
        ]),
        h("div", { class: "isv-tile-name" }, [name]),
        tooltip,
      ],
    );
  });

  return h("div", { class: "isv-grid" }, tiles);
}
