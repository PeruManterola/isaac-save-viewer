import type { Filter, ViewMode } from "../state/filter.js";
import { FILTERS, VIEW_MODES } from "../state/filter.js";
import type { Preferences } from "../state/preferences.js";
import { h } from "./dom.js";
import type { IconName } from "./icons.js";
import { segmented } from "./ui.js";

/** The "grid" view mode is called the "wall" in the interface. */
const VIEW_MODE_LABELS = {
  list: "List",
  grid: "Wall",
} as const satisfies Record<ViewMode, string>;

const VIEW_MODE_ICONS = {
  list: "list",
  grid: "grid",
} as const satisfies Record<ViewMode, IconName>;

const FILTER_LABELS = {
  all: "All",
  locked: "Locked",
  unlocked: "Unlocked",
} as const satisfies Record<Filter, string>;

interface ToolbarState {
  readonly viewMode: ViewMode;
  readonly filter: Filter;
}

/**
 * Creates a section with a toolbar (view and filter) above a body. The body is rendered again
 * whenever the toolbar changes, and the toolbar state is remembered.
 *
 * @param preferences Where to remember the toolbar state.
 * @param section The ID of the section, used to remember the toolbar state.
 * @param label The name of the section, used to label the button groups.
 * @param renderBody Returns the content of the body for the given toolbar state.
 */
export function withToolbar(
  preferences: Preferences,
  section: string,
  label: string,
  renderBody: (state: ToolbarState) => readonly Node[],
): readonly HTMLElement[] {
  let state: ToolbarState = {
    viewMode: preferences.getViewMode(section),
    filter: preferences.getFilter(section),
  };
  const body = h("div", { class: "isv-section-body" });

  const viewModeGroup = segmented({
    label: `${label} view`,
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
  const filterGroup = segmented({
    label: `${label} filter`,
    kind: "pressed",
    options: FILTERS.map((value) => ({ value, label: FILTER_LABELS[value] })),
    value: state.filter,
    onChange: (filter) => {
      preferences.setFilter(section, filter);
      update({ ...state, filter });
    },
  });

  function update(newState: ToolbarState) {
    state = newState;
    body.replaceChildren(...renderBody(state));
  }

  update(state);

  const toolbar = h("div", { class: "isv-toolbar" }, [
    viewModeGroup.element,
    filterGroup.element,
  ]);

  return [toolbar, body];
}
