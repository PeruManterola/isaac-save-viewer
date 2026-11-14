import type { Filter, ViewMode } from "../state/filter.js";
import { FILTERS, VIEW_MODES } from "../state/filter.js";
import type { Preferences } from "../state/preferences.js";
import { h } from "./dom.js";

const VIEW_MODE_LABELS = {
  list: "List",
  grid: "Grid",
} as const satisfies Record<ViewMode, string>;

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

  const viewModeGroup = buttonGroup(
    `${label} view`,
    VIEW_MODES,
    VIEW_MODE_LABELS,
    state.viewMode,
    (viewMode) => {
      preferences.setViewMode(section, viewMode);
      update({ ...state, viewMode });
    },
  );
  const filterGroup = buttonGroup(
    `${label} filter`,
    FILTERS,
    FILTER_LABELS,
    state.filter,
    (filter) => {
      preferences.setFilter(section, filter);
      update({ ...state, filter });
    },
  );

  function update(newState: ToolbarState) {
    state = newState;
    viewModeGroup.select(state.viewMode);
    filterGroup.select(state.filter);
    body.replaceChildren(...renderBody(state));
  }

  update(state);

  const toolbar = h("div", { class: "isv-toolbar" }, [
    viewModeGroup.element,
    filterGroup.element,
  ]);

  return [toolbar, body];
}

function buttonGroup<T extends string>(
  ariaLabel: string,
  values: readonly T[],
  labels: Readonly<Record<T, string>>,
  initialValue: T,
  onSelect: (value: T) => void,
) {
  const buttons = values.map((value) => {
    const button = h("button", { type: "button", class: "button is-small" }, [
      labels[value],
    ]);
    button.addEventListener("click", () => {
      onSelect(value);
    });

    return { value, button };
  });

  function select(selectedValue: T) {
    for (const { value, button } of buttons) {
      const selected = value === selectedValue;
      button.classList.toggle("is-link", selected);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected.toString());
    }
  }

  select(initialValue);

  const element = h(
    "div",
    { class: "buttons has-addons", role: "group", "aria-label": ariaLabel },
    buttons.map(({ button }) => button),
  );

  return { element, select };
}
