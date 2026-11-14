// The toolbar of the achievements and items sections: the filter, the Wall | List switch, and the
// search field. The filter and the view are remembered, the search is not.

import type { Filter, ViewMode } from "../state/filter.js";
import { FILTERS, VIEW_MODES } from "../state/filter.js";
import type { Preferences } from "../state/preferences.js";
import type { SearchQuery } from "../state/search.js";
import { EMPTY_QUERY, isSameQuery, parseQuery } from "../state/search.js";
import { h } from "./dom.js";
import type { IconName } from "./icons.js";
import { icon } from "./icons.js";
import { segmented } from "./ui.js";

const SEARCH_DEBOUNCE_MS = 150;

/** The "grid" view mode is called the "wall" in the interface. */
const VIEW_MODE_LABELS = {
  list: "List",
  grid: "Wall",
} as const satisfies Record<ViewMode, string>;

const VIEW_MODE_ICONS = {
  list: "list",
  grid: "grid",
} as const satisfies Record<ViewMode, IconName>;

export interface ToolbarState {
  readonly viewMode: ViewMode;
  readonly filter: Filter;
  readonly query: SearchQuery;
}

interface ToolbarConfig {
  readonly preferences: Preferences;
  /** The ID of the section, used to remember the view and the filter. */
  readonly section: string;
  /** What is listed, in the plural. E.g. "achievements". */
  readonly noun: string;
  readonly filterLabels: Readonly<Record<Filter, string>>;
  /** The real totals. They do not change with the search. */
  readonly filterCounts: Readonly<Record<Filter, number>>;
  /** Called when the view, the filter, or the (debounced) search changes. */
  readonly onChange: (state: ToolbarState) => void;
}

interface Toolbar {
  readonly element: HTMLElement;
  readonly getState: () => ToolbarState;
  /** Sets the text of the polite live region, e.g. "12 achievements match". */
  readonly setStatus: (text: string) => void;
  readonly clearSearch: () => void;
  readonly setFilter: (filter: Filter) => void;
}

export function createToolbar(config: ToolbarConfig): Toolbar {
  const { preferences, section, noun } = config;
  let state: ToolbarState = {
    viewMode: preferences.getViewMode(section),
    filter: preferences.getFilter(section),
    query: EMPTY_QUERY,
  };

  function update(newState: ToolbarState) {
    state = newState;
    config.onChange(state);
  }

  const filterGroup = segmented({
    label: `Filter ${noun}`,
    kind: "pressed",
    options: FILTERS.map((value) => ({
      value,
      label: config.filterLabels[value],
      count: config.filterCounts[value],
    })),
    value: state.filter,
    onChange: (filter) => {
      preferences.setFilter(section, filter);
      update({ ...state, filter });
    },
  });

  const viewGroup = segmented({
    label: `View ${noun}`,
    kind: "pressed",
    options: VIEW_MODES.map((value) => ({
      value,
      label: VIEW_MODE_LABELS[value],
      icon: VIEW_MODE_ICONS[value],
    })),
    value: state.viewMode,
    onChange: (viewMode) => {
      preferences.setViewMode(section, viewMode);
      update({ ...state, viewMode });
    },
  });

  const input = h("input", {
    type: "search",
    class: "search-input",
    "aria-label": `Search ${noun}`,
    placeholder: `Search ${noun}`,
    autocomplete: "off",
    spellcheck: "false",
    enterkeyhint: "search",
  });
  const clearButton = h(
    "button",
    {
      type: "button",
      class: "search-clear",
      "aria-label": "Clear search",
      hidden: "",
    },
    [icon("close")],
  );
  const status = h("p", {
    class: "search-status small muted",
    role: "status",
    "aria-live": "polite",
  });

  let timer: ReturnType<typeof setTimeout> | undefined;

  /** Applies what is typed, unless it means the same search as before. */
  function commitQuery() {
    clearTimeout(timer);
    timer = undefined;
    const query = parseQuery(input.value);
    if (!isSameQuery(query, state.query)) {
      update({ ...state, query });
    }
  }

  function clearSearch() {
    input.value = "";
    clearButton.hidden = true;
    commitQuery();
  }

  input.addEventListener("input", () => {
    clearButton.hidden = input.value === "";
    clearTimeout(timer);
    timer = setTimeout(commitQuery, SEARCH_DEBOUNCE_MS);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitQuery();
    } else if (event.key === "Escape" && input.value !== "") {
      // Only clear the search. Without a search, Escape can still close the details.
      event.preventDefault();
      event.stopPropagation();
      clearSearch();
    }
  });
  clearButton.addEventListener("click", () => {
    clearSearch();
    input.focus();
  });

  const search = h("div", { class: "search", role: "search" }, [
    icon("search"),
    input,
    clearButton,
  ]);

  const element = h("div", { class: "toolbar" }, [
    h("div", { class: "toolbar-row" }, [
      filterGroup.element,
      viewGroup.element,
      search,
    ]),
    status,
  ]);

  return {
    element,
    getState: () => state,
    setStatus: (text) => {
      status.textContent = text;
    },
    clearSearch,
    setFilter: (filter) => {
      if (filter !== state.filter) {
        filterGroup.select(filter);
        preferences.setFilter(section, filter);
        update({ ...state, filter });
      }
    },
  };
}
