// Runs "static/theme-init.js" (the script that applies the saved theme before the first paint)
// against fake `localStorage` and `document` objects.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, test } from "vitest";
import { KEY_PREFIX } from "../src/state/preferences.js";

const SCRIPT = readFileSync(
  path.join(import.meta.dirname, "..", "static", "theme-init.js"),
  "utf8",
);

/** Runs the script, and returns the `data-theme` it set (undefined if it set none). */
function runScript(
  getItem: (key: string) => string | undefined,
): string | undefined {
  let dataTheme: string | undefined;
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        if (name === "data-theme") {
          dataTheme = value;
        }
      },
    },
  };
  vm.runInNewContext(SCRIPT, { localStorage: { getItem }, document });
  return dataTheme;
}

describe("theme-init.js", () => {
  test("reads the same key that the preferences write", () => {
    let key: string | undefined;
    runScript((requestedKey) => {
      key = requestedKey;
      return undefined;
    });
    expect(key).toBe(`${KEY_PREFIX}theme`);
  });

  test("forces a saved light or dark theme", () => {
    expect(runScript(() => "light")).toBe("light");
    expect(runScript(() => "dark")).toBe("dark");
  });

  test("sets nothing for system, nothing saved, or an invalid value", () => {
    expect(runScript(() => "system")).toBeUndefined();
    expect(runScript(() => undefined)).toBeUndefined();
    expect(runScript(() => "sepia")).toBeUndefined();
  });

  test("does not throw when storage is disabled", () => {
    expect(
      runScript(() => {
        throw new Error("Storage is disabled.");
      }),
    ).toBeUndefined();
  });
});
