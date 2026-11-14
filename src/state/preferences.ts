// Preferences that are remembered in the browser: the colour theme, the view and filter of each
// section, and which sections and groups are collapsed.

import type { Filter, ViewMode } from "./filter.js";
import {
  DEFAULT_FILTER,
  DEFAULT_VIEW_MODE,
  isFilter,
  isViewMode,
} from "./filter.js";
import type { MarksShow } from "./marksView.js";
import { DEFAULT_MARKS_SHOW, isMarksShow } from "./marksView.js";
import type { Theme } from "./theme.js";
import { DEFAULT_THEME, isTheme } from "./theme.js";

/** All keys start with this, so that they do not clash with anything else on the same origin. */
export const KEY_PREFIX = "isv:";

const COLLAPSED_VALUE = "1";
const EXPANDED_VALUE = "0";

/** The subset of the `Storage` interface (e.g. `localStorage`) that we use. */
export interface KeyValueStorage {
  /** `localStorage` returns null for missing keys. */
  getItem: (key: string) => string | null | undefined;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/**
 * Reads and writes preferences. Storage can be missing or throw (e.g. when it is disabled), in
 * which case the defaults are used and nothing is remembered.
 */
export class Preferences {
  private readonly storage: KeyValueStorage | undefined;

  constructor(storage: KeyValueStorage | undefined) {
    this.storage = storage;
  }

  getTheme(): Theme {
    const value = this.get("theme");
    return isTheme(value) ? value : DEFAULT_THEME;
  }

  setTheme(theme: Theme): void {
    this.set("theme", theme);
  }

  getViewMode(section: string): ViewMode {
    const value = this.get(`${section}:view`);
    return isViewMode(value) ? value : DEFAULT_VIEW_MODE;
  }

  setViewMode(section: string, viewMode: ViewMode): void {
    this.set(`${section}:view`, viewMode);
  }

  getFilter(section: string): Filter {
    const value = this.get(`${section}:filter`);
    return isFilter(value) ? value : DEFAULT_FILTER;
  }

  setFilter(section: string, filter: Filter): void {
    this.set(`${section}:filter`, filter);
  }

  /** Which characters the completion marks section shows. */
  getMarksShow(): MarksShow {
    const value = this.get("marks:show");
    return isMarksShow(value) ? value : DEFAULT_MARKS_SHOW;
  }

  setMarksShow(show: MarksShow): void {
    this.set("marks:show", show);
  }

  /** @param id The ID of a section or group. Everything is expanded by default. */
  isCollapsed(id: string): boolean {
    return this.getCollapsed(id) ?? false;
  }

  /**
   * Whether the user collapsed (true) or expanded (false) the section or group, or undefined if
   * they never chose. The caller picks the default then, e.g. complete groups start collapsed.
   */
  getCollapsed(id: string): boolean | undefined {
    const value = this.get(`collapsed:${id}`);
    if (value === undefined) {
      return undefined;
    }

    return value === COLLAPSED_VALUE;
  }

  setCollapsed(id: string, collapsed: boolean): void {
    this.set(`collapsed:${id}`, collapsed ? COLLAPSED_VALUE : EXPANDED_VALUE);
  }

  private get(key: string): string | undefined {
    try {
      return this.storage?.getItem(KEY_PREFIX + key) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private set(key: string, value: string): void {
    try {
      this.storage?.setItem(KEY_PREFIX + key, value);
    } catch {
      // Storage is full or disabled, so the preference is not remembered.
    }
  }
}
