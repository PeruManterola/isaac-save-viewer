import { describe, expect, test } from "vitest";
import { matchesFilter } from "../src/state/filter.js";
import type { KeyValueStorage } from "../src/state/preferences.js";
import { KEY_PREFIX, Preferences } from "../src/state/preferences.js";

function memoryStorage(): KeyValueStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key),
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

function fail(): never {
  throw new Error("Storage is disabled.");
}

function throwingStorage(): KeyValueStorage {
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe("matchesFilter", () => {
  test("all, locked, and unlocked", () => {
    expect(matchesFilter(true, "all")).toBe(true);
    expect(matchesFilter(false, "all")).toBe(true);
    expect(matchesFilter(true, "locked")).toBe(false);
    expect(matchesFilter(false, "locked")).toBe(true);
    expect(matchesFilter(true, "unlocked")).toBe(true);
    expect(matchesFilter(false, "unlocked")).toBe(false);
  });
});

describe("Preferences", () => {
  test("defaults to the wall, the locked filter, and no collapsed choice", () => {
    const preferences = new Preferences(memoryStorage());
    expect(preferences.getViewMode("achievements")).toBe("grid");
    expect(preferences.getFilter("achievements")).toBe("locked");
    expect(preferences.getCollapsed("achievements")).toBeUndefined();
  });

  test("remembers each section separately", () => {
    const storage = memoryStorage();
    const preferences = new Preferences(storage);
    preferences.setViewMode("achievements", "list");
    preferences.setFilter("items", "all");

    const reloaded = new Preferences(storage);
    expect(reloaded.getViewMode("achievements")).toBe("list");
    expect(reloaded.getFilter("achievements")).toBe("locked");
    expect(reloaded.getViewMode("items")).toBe("grid");
    expect(reloaded.getFilter("items")).toBe("all");
  });

  test("tells apart a choice from no choice for a collapsed group", () => {
    const storage = memoryStorage();
    const preferences = new Preferences(storage);
    expect(preferences.getCollapsed("achievements:misc")).toBeUndefined();

    preferences.setCollapsed("achievements:misc", false);
    expect(new Preferences(storage).getCollapsed("achievements:misc")).toBe(
      false,
    );
    preferences.setCollapsed("achievements:misc", true);
    expect(new Preferences(storage).getCollapsed("achievements:misc")).toBe(
      true,
    );
  });

  test("a stored collapsed value from before keeps working", () => {
    const storage = memoryStorage();
    storage.setItem("isv:collapsed:achievements:tainted", "1");
    const preferences = new Preferences(storage);
    expect(preferences.getCollapsed("achievements:tainted")).toBe(true);
  });

  test("every key starts with the prefix", () => {
    const storage = memoryStorage();
    const preferences = new Preferences(storage);
    preferences.setViewMode("items", "grid");
    preferences.setFilter("items", "unlocked");
    preferences.setCollapsed("items", true);

    expect(KEY_PREFIX).toBe("isv:");
    expect([...storage.items.keys()]).toStrictEqual([
      "isv:items:view",
      "isv:items:filter",
      "isv:collapsed:items",
    ]);
  });

  test("ignores invalid stored values", () => {
    const storage = memoryStorage();
    storage.setItem("isv:items:view", "table");
    storage.setItem("isv:items:filter", "LOCKED");
    const preferences = new Preferences(storage);
    expect(preferences.getViewMode("items")).toBe("grid");
    expect(preferences.getFilter("items")).toBe("locked");
  });

  test("defaults to following the system theme", () => {
    expect(new Preferences(memoryStorage()).getTheme()).toBe("system");
  });

  test("remembers the theme as isv:theme", () => {
    const storage = memoryStorage();
    const preferences = new Preferences(storage);
    preferences.setTheme("dark");
    expect(storage.items.get("isv:theme")).toBe("dark");
    expect(new Preferences(storage).getTheme()).toBe("dark");

    preferences.setTheme("light");
    expect(new Preferences(storage).getTheme()).toBe("light");
    preferences.setTheme("system");
    expect(new Preferences(storage).getTheme()).toBe("system");
  });

  test("ignores an invalid stored theme", () => {
    const storage = memoryStorage();
    storage.setItem("isv:theme", "sepia");
    expect(new Preferences(storage).getTheme()).toBe("system");
  });

  test("works without storage", () => {
    for (const storage of [undefined, throwingStorage()]) {
      const preferences = new Preferences(storage);
      expect(() => {
        preferences.setViewMode("items", "grid");
        preferences.setFilter("items", "all");
        preferences.setCollapsed("items", true);
        preferences.setCollapsed("items", false);
        preferences.setTheme("dark");
      }).not.toThrow();
      expect(preferences.getTheme()).toBe("system");
      expect(preferences.getViewMode("items")).toBe("grid");
      expect(preferences.getFilter("items")).toBe("locked");
      expect(preferences.getCollapsed("items")).toBeUndefined();
    }
  });
});
