// The view and filter options of the toolbars.

export const VIEW_MODES = ["list", "grid"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const FILTERS = ["all", "locked", "unlocked"] as const;
export type Filter = (typeof FILTERS)[number];

/** The wall is the main presentation, so it is the default. */
export const DEFAULT_VIEW_MODE: ViewMode = "grid";
export const DEFAULT_FILTER: Filter = "locked";

export function isViewMode(value: unknown): value is ViewMode {
  return VIEW_MODES.includes(value as ViewMode);
}

export function isFilter(value: unknown): value is Filter {
  return FILTERS.includes(value as Filter);
}

export function matchesFilter(unlocked: boolean, filter: Filter): boolean {
  switch (filter) {
    case "all": {
      return true;
    }

    case "locked": {
      return !unlocked;
    }

    case "unlocked": {
      return unlocked;
    }
  }
}
