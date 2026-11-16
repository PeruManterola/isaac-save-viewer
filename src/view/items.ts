// The items section: one card with a toolbar, then the items that are still to touch (with their
// names visible, so you know what to hunt), then a wall of the touched ones. Like the achievements,
// the nodes are built once, the first time they are shown.

import type { ItemEntry } from "../save/model.js";
import { getProgress } from "../save/model.js";
import type { Filter } from "../state/filter.js";
import { matchesFilter } from "../state/filter.js";
import type { Preferences } from "../state/preferences.js";
import {
  buildSearchText,
  isQueryActive,
  matchesQuery,
} from "../state/search.js";
import { h } from "./dom.js";
import type { DisplayEntry } from "./entries.js";
import {
  createRows,
  createWall,
  createWantCard,
  enableDetails,
  syncVisibility,
} from "./entries.js";
import { createNoMatches, matchCountText, matchesText } from "./noMatches.js";
import { closeDetail } from "./popover.js";
import { percentText, progressText } from "./progress.js";
import type { ToolbarState } from "./toolbar.js";
import { createToolbar } from "./toolbar.js";
import { badge, progressBar } from "./ui.js";

const SECTION_ID = "items";

const FILTER_LABELS = {
  all: "All",
  locked: "Not touched",
  unlocked: "Touched",
} as const satisfies Record<Filter, string>;

const FILTER_NOTES = {
  all: undefined,
  locked: "Only items that are not touched are shown.",
  unlocked: "Only touched items are shown.",
} as const satisfies Record<Filter, string | undefined>;

/** Which filter shows the group. "All" shows both. */
type GroupKind = "todo" | "touched";

interface Group {
  readonly kind: GroupKind;
  readonly entries: readonly DisplayEntry[];
  readonly element: HTMLElement;
  /** The cards or tiles. Built the first time they are shown. */
  grid: HTMLElement | undefined;
  list: HTMLElement | undefined;
  readonly content: HTMLElement;
  readonly matchBadge: HTMLElement;
  readonly note: HTMLElement;
  visible: number;
}

export function renderItemsSection(
  items: readonly ItemEntry[],
  preferences: Preferences,
): HTMLElement {
  const progress = getProgress(items);
  const entries = items.map((item) => toDisplayEntry(item));
  const toolbar = createToolbar({
    preferences,
    section: SECTION_ID,
    noun: "items",
    filterLabels: FILTER_LABELS,
    filterCounts: {
      all: progress.total,
      locked: progress.total - progress.unlocked,
      unlocked: progress.unlocked,
    },
    onChange: apply,
  });
  const noMatches = createNoMatches(
    () => {
      toolbar.clearSearch();
    },
    () => {
      toolbar.setFilter("all");
    },
  );

  const todo = createGroup(
    "todo",
    entries.filter((entry) => !entry.unlocked),
  );
  const touched = createGroup(
    "touched",
    entries.filter((entry) => entry.unlocked),
  );

  function apply(state: ToolbarState) {
    closeDetail(false);
    const searching = isQueryActive(state.query);
    for (const entry of entries) {
      entry.matches =
        matchesFilter(entry.unlocked, state.filter)
        && matchesQuery(state.query, entry);
    }

    let total = 0;
    for (const group of [todo, touched]) {
      group.visible = group.entries.filter((entry) => entry.matches).length;
      total += group.visible;
      renderGroup(group, state);
    }

    toolbar.setStatus(searching ? matchCountText(total, state.query) : "");
    noMatches.element.hidden = !(searching && total === 0);
    if (searching && total === 0) {
      noMatches.update(state.query, FILTER_NOTES[state.filter]);
    }
  }

  const card = h("div", { class: "card items-card pop-host" }, [
    h("div", { class: "sec-h" }, [
      h("h2", {}, ["Items touched"]),
      h("span", { class: "muted" }, [
        `${progressText(progress)} - ${percentText(progress)}`,
      ]),
    ]),
    progressBar({
      value: progress.unlocked,
      max: progress.total,
      label: "Items touched",
    }),
    toolbar.element,
    todo.element,
    touched.element,
    noMatches.element,
  ]);
  enableDetails(card);
  apply(toolbar.getState());

  return card;
}

function createGroup(kind: GroupKind, entries: readonly DisplayEntry[]): Group {
  const matchBadge = badge("need", "");
  matchBadge.hidden = true;
  const note = h("div", { class: "group-note" });
  const content = h("div", { class: "group-content" });

  // When nothing is left to touch, the "Complete" note says it, so there is no "0 items" badge.
  const heading =
    kind === "todo"
      ? [
          h("h3", {}, ["Still to touch"]),
          ...(entries.length === 0
            ? []
            : [badge("need", `${entries.length} items`)]),
          matchBadge,
          ...(entries.length === 0
            ? []
            : [
                h("span", { class: "small muted" }, [
                  "Names shown so you know what to hunt",
                ]),
              ]),
        ]
      : [
          h("h3", {}, ["Touched"]),
          badge("ok", `${entries.length} touched`, "check"),
          matchBadge,
        ];

  const element = h("section", { class: "group" }, [
    h("div", { class: "sub" }, heading),
    content,
    note,
  ]);
  return {
    kind,
    entries,
    element,
    grid: undefined,
    list: undefined,
    content,
    matchBadge,
    note,
    visible: 0,
  };
}

function renderGroup(group: Group, state: ToolbarState) {
  const searching = isQueryActive(state.query);
  const excluded =
    state.filter !== "all"
    && (group.kind === "todo") !== (state.filter === "locked");
  const hidden = excluded || (searching && group.visible === 0);

  group.element.hidden = hidden;
  group.matchBadge.hidden = !searching;
  if (searching) {
    group.matchBadge.textContent = matchesText(group.visible);
  }
  if (hidden) {
    return;
  }

  const hasNodes = group.visible > 0;
  group.content.hidden = !hasNodes;
  if (hasNodes) {
    showEntries(group, state);
  }

  // Nothing to show without a search: everything is touched, or nothing is yet.
  group.note.replaceChildren(...(hasNodes ? [] : [emptyNote(group.kind)]));
}

function emptyNote(kind: GroupKind): Node {
  return kind === "todo"
    ? h("p", { class: "complete-note" }, [
        badge("ok", "Complete", "check"),
        "You have touched every item.",
      ])
    : h("p", { class: "cat-empty muted small" }, ["No items touched yet."]);
}

function showEntries(group: Group, state: ToolbarState) {
  const label = group.kind === "todo" ? "Items to touch" : "Touched items";

  if (state.viewMode === "grid" && group.grid === undefined) {
    group.grid =
      group.kind === "todo"
        ? h(
            "ul",
            { class: "want-grid", "aria-label": label },
            group.entries.map((entry) => createWantCard(entry)),
          )
        : createWall(group.entries, label);
    group.content.append(group.grid);
  }
  if (state.viewMode === "list" && group.list === undefined) {
    group.list = createRows(group.entries, label);
    group.content.append(group.list);
  }

  if (group.grid !== undefined) {
    group.grid.hidden = state.viewMode !== "grid";
  }
  if (group.list !== undefined) {
    group.list.hidden = state.viewMode !== "list";
  }

  syncVisibility(group.entries);
}

function getPoolsText(item: ItemEntry): string {
  return item.pools.length === 0
    ? "Not in any item pool"
    : item.pools.join(", ");
}

/** A short version of the pools: the first one and how many more there are. */
function getPoolsSummary(item: ItemEntry): string {
  const [first] = item.pools;
  if (first === undefined) {
    return "Not in any item pool";
  }

  return item.pools.length === 1 ? first : `${first} +${item.pools.length - 1}`;
}

function toDisplayEntry(item: ItemEntry): DisplayEntry {
  const statusText = item.unlocked ? "Touched" : "Not touched";

  return {
    id: item.id,
    name: item.name,
    unlocked: item.unlocked,
    icon: item.icon,
    stateWord: statusText.toLowerCase(),
    statusText,
    secondary: getPoolsSummary(item),
    searchText: buildSearchText(item.name, ...item.pools),
    detail: () => ({
      name: item.name,
      subtitle: `#${item.id} · Item`,
      icon: item.icon,
      unlocked: item.unlocked,
      statusText,
      fields: [{ label: "Item pools", text: getPoolsText(item) }],
    }),
    matches: true,
    nodes: [],
  };
}
