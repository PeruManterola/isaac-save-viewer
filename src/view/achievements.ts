// The achievements section: one toolbar card, then one card per category. The toolbar governs all
// the cards. Tiles and rows are built the first time a card is shown, and then only hidden and
// shown again.

import type { Category } from "../save/categories.js";
import { CATEGORIES } from "../save/categories.js";
import type { AchievementEntry } from "../save/model.js";
import { getProgress } from "../save/model.js";
import type { Filter } from "../state/filter.js";
import { matchesFilter } from "../state/filter.js";
import type { Preferences } from "../state/preferences.js";
import {
  buildSearchText,
  isQueryActive,
  matchesQuery,
} from "../state/search.js";
import { h, lazyImage } from "./dom.js";
import type { DisplayEntry } from "./entries.js";
import {
  createRows,
  createWall,
  enableDetails,
  syncVisibility,
} from "./entries.js";
import { icon } from "./icons.js";
import { createNoMatches, matchCountText, matchesText } from "./noMatches.js";
import { closeDetail } from "./popover.js";
import { progressText } from "./progress.js";
import type { ToolbarState } from "./toolbar.js";
import { createToolbar } from "./toolbar.js";
import { badge, progressBar } from "./ui.js";

const SECTION_ID = "achievements";
const WIKI_PREFIX = "https://bindingofisaacrebirth.wiki.gg/wiki/";
const LEGEND_ICON_SIZE = 16;

const FILTER_LABELS = {
  all: "All",
  locked: "Locked",
  unlocked: "Unlocked",
} as const satisfies Record<Filter, string>;

const EMPTY_TEXTS = {
  all: "There are no achievements here.",
  locked: "Nothing is locked here.",
  unlocked: "Nothing is unlocked here yet.",
} as const satisfies Record<Filter, string>;

const FILTER_NOTES = {
  all: undefined,
  locked: "Only locked achievements are shown.",
  unlocked: "Only unlocked achievements are shown.",
} as const satisfies Record<Filter, string | undefined>;

interface CategoryView {
  readonly id: Category;
  readonly name: string;
  readonly entries: readonly DisplayEntry[];
  readonly complete: boolean;
  readonly card: HTMLElement;
  readonly toggle: HTMLButtonElement;
  readonly matchBadge: HTMLElement;
  readonly body: HTMLElement;
  readonly empty: HTMLElement;
  /** The wall and the list are built the first time they are shown. */
  wall: HTMLElement | undefined;
  list: HTMLElement | undefined;
  /** Whether the user wants it open. A search can show it anyway, but does not change this. */
  open: boolean;
  /** How many entries pass the filter and the search. */
  visible: number;
}

export function renderAchievementsSection(
  achievements: readonly AchievementEntry[],
  preferences: Preferences,
): HTMLElement {
  const progress = getProgress(achievements);

  const toolbar = createToolbar({
    preferences,
    section: SECTION_ID,
    noun: "achievements",
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

  const categories = CATEGORIES.map(({ id, name }) => {
    const entries = achievements
      .filter((achievement) => achievement.category === id)
      .map((achievement) => toDisplayEntry(achievement, name));
    return createCategory(id, name, entries);
  });

  /** Updates everything that depends on the toolbar. */
  function apply(state: ToolbarState) {
    closeDetail(false);
    const searching = isQueryActive(state.query);
    let total = 0;
    for (const category of categories) {
      category.visible = 0;
      for (const entry of category.entries) {
        entry.matches =
          matchesFilter(entry.unlocked, state.filter)
          && matchesQuery(state.query, entry);
        if (entry.matches) {
          category.visible++;
        }
      }
      total += category.visible;
      renderCategory(category, state);
    }

    toolbar.setStatus(searching ? matchCountText(total, state.query) : "");
    noMatches.element.hidden = !(searching && total === 0);
    if (searching && total === 0) {
      noMatches.update(state.query, FILTER_NOTES[state.filter]);
    }
  }

  function createCategory(
    id: Category,
    name: string,
    entries: readonly DisplayEntry[],
  ): CategoryView {
    const done = getProgress(entries);
    const complete = done.unlocked === done.total;
    const bodyID = `achievements-body-${id}`;
    const stored = preferences.getCollapsed(`${SECTION_ID}:${id}`);

    const matchBadge = badge("need", "");
    matchBadge.hidden = true;
    const toggle = h(
      "button",
      {
        type: "button",
        class: "cat-toggle",
        "aria-controls": bodyID,
        "aria-expanded": "false",
      },
      [
        h("span", { class: "cat-name" }, [name]),
        h("span", { class: "cnt" }, [progressText(done).replace(" / ", "/")]),
        complete
          ? badge("ok", "Complete", "check")
          : badge("locked", `${done.total - done.unlocked} locked`, "lock"),
        matchBadge,
        icon("chevron"),
      ],
    );
    const empty = h("p", { class: "cat-empty muted small" });
    const body = h("div", { class: "cat-body", id: bodyID, hidden: "" }, [
      empty,
    ]);
    const card = h(
      "section",
      { class: complete ? "card cat pop-host complete" : "card cat pop-host" },
      [
        h("div", { class: "cat-h" }, [
          h("h3", {}, [toggle]),
          ...(complete
            ? []
            : [
                progressBar({
                  value: done.unlocked,
                  max: done.total,
                  label: `${name} progress`,
                  thin: true,
                }),
              ]),
        ]),
        body,
      ],
    );

    const category: CategoryView = {
      id,
      name,
      entries,
      complete,
      card,
      toggle,
      matchBadge,
      body,
      empty,
      wall: undefined,
      list: undefined,
      // Categories that are complete start collapsed, until the user chooses.
      open: stored === undefined ? !complete : !stored,
      visible: 0,
    };

    toggle.addEventListener("click", () => {
      closeDetail(false);
      category.open = !category.open;
      preferences.setCollapsed(`${SECTION_ID}:${id}`, !category.open);
      renderCategory(category, toolbar.getState());
    });

    return category;
  }

  const tileKey = createTileKey(achievements);
  const toolbarCard = h("div", { class: "card toolbar-card" }, [
    h("div", { class: "sec-h" }, [
      h("h2", {}, ["Achievements"]),
      h("span", { class: "muted" }, ["Select a tile for details"]),
    ]),
    toolbar.element,
    tileKey,
  ]);

  const root = h("div", { class: "stack" }, [
    toolbarCard,
    ...categories.map((category) => category.card),
    noMatches.element,
  ]);
  enableDetails(root);
  apply(toolbar.getState());

  return root;
}

function renderCategory(category: CategoryView, state: ToolbarState) {
  const searching = isQueryActive(state.query);
  // A complete category has nothing left to show under "Locked", so it is only its header.
  const compact = !searching && category.complete && state.filter === "locked";
  const shown = searching || category.open;
  const bodyShown = shown && !compact;

  category.card.hidden = searching && category.visible === 0;
  category.card.classList.toggle("is-compact", compact);
  category.toggle.setAttribute("aria-expanded", bodyShown.toString());
  category.toggle.disabled = searching || compact;
  category.matchBadge.hidden = !searching;
  if (searching) {
    category.matchBadge.textContent = matchesText(category.visible);
  }

  category.body.hidden = !bodyShown;
  if (!bodyShown || category.card.hidden) {
    return;
  }

  if (state.viewMode === "grid" && category.wall === undefined) {
    category.wall = createWall(
      category.entries,
      `${category.name} achievements`,
    );
    category.body.prepend(category.wall);
  }
  if (state.viewMode === "list" && category.list === undefined) {
    // Locked first, so that what is missing is at the top.
    const sorted = [
      ...category.entries.filter((entry) => !entry.unlocked),
      ...category.entries.filter((entry) => entry.unlocked),
    ];
    category.list = createRows(sorted, `${category.name} achievements`);
    category.body.prepend(category.list);
  }

  if (category.wall !== undefined) {
    category.wall.hidden = state.viewMode !== "grid";
  }
  if (category.list !== undefined) {
    category.list.hidden = state.viewMode !== "list";
  }

  syncVisibility(category.entries);
  category.empty.hidden = category.visible > 0;
  category.empty.textContent = EMPTY_TEXTS[state.filter];
}

function toDisplayEntry(
  achievement: AchievementEntry,
  categoryName: string,
): DisplayEntry {
  return {
    id: achievement.id,
    name: achievement.name,
    unlocked: achievement.unlocked,
    icon: achievement.icon,
    stateWord: achievement.unlocked ? "unlocked" : "locked",
    statusText: achievement.unlocked ? "Unlocked" : "Locked",
    secondary: achievement.unlockDescription,
    searchText: buildSearchText(
      achievement.name,
      achievement.unlockDescription,
      achievement.inGameDescription,
    ),
    detail: () => ({
      name: achievement.name,
      subtitle: `#${achievement.id} · ${categoryName}`,
      icon: achievement.icon,
      unlocked: achievement.unlocked,
      statusText: achievement.unlocked ? "Unlocked" : "Locked",
      fields: [
        { label: "In-game text", text: achievement.inGameDescription },
        { label: "How to unlock", text: achievement.unlockDescription },
      ],
      ...(achievement.link === ""
        ? {}
        : {
            link: {
              href: `${WIKI_PREFIX}${achievement.link}`,
              text: "Open wiki page",
            },
          }),
    }),
    matches: true,
    nodes: [],
  };
}

/** Explains the look of a locked tile, using real icons. */
function createTileKey(achievements: readonly AchievementEntry[]): HTMLElement {
  const withIcon = achievements.filter(
    (achievement) => achievement.icon !== undefined,
  );
  const unlockedSample =
    withIcon.find((achievement) => achievement.unlocked) ?? withIcon[0];
  const lockedSample =
    withIcon.find((achievement) => !achievement.unlocked) ?? withIcon[1];

  const sample = (
    achievement: AchievementEntry | undefined,
    className: string,
  ) =>
    h("span", { class: className }, [
      achievement?.icon === undefined
        ? ""
        : lazyImage(achievement.icon, "", LEGEND_ICON_SIZE, "px"),
    ]);

  return h("div", { class: "tile-key" }, [
    h("span", {}, [sample(unlockedSample, "tile"), "Unlocked: full colour"]),
    h("span", {}, [
      sample(lockedSample, "tile is-locked"),
      "Locked: hatched tile, grey icon, lock badge",
    ]),
  ]);
}
