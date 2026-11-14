// The view and filter options of the toolbars.

export const VIEW_MODES = ["list", "grid"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const FILTERS = ["all", "locked", "unlocked"] as const;
export type Filter = (typeof FILTERS)[number];

export const DEFAULT_VIEW_MODE: ViewMode = "list";
export const DEFAULT_FILTER: Filter = "locked";

export function isViewMode(value: unknown): value is ViewMode {
  return VIEW_MODES.includes(value as ViewMode);
}

export function isFilter(value: unknown): value is Filter {
  return FILTERS.includes(value as Filter);
}

export function filterEntries<T extends { readonly unlocked: boolean }>(
  entries: readonly T[],
  filter: Filter,
): readonly T[] {
  switch (filter) {
    case "all": {
      return entries;
    }

    case "locked": {
      return entries.filter((entry) => !entry.unlocked);
    }

    case "unlocked": {
      return entries.filter((entry) => entry.unlocked);
    }
  }
}
