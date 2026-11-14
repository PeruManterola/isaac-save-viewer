import { describe, expect, test } from "vitest";
import type { MarksModel } from "../src/save/marks.js";
import { getMarks } from "../src/save/marks.js";
import {
  characterSummaryText,
  DEFAULT_MARKS_SHOW,
  filterSummaries,
  getCharacterGroups,
  getIncomplete,
  isMarksShow,
  stillToDoText,
  summarizeCharacter,
  visibleCharacterName,
} from "../src/state/marksView.js";
import type { KeyValueStorage } from "../src/state/preferences.js";
import { Preferences } from "../src/state/preferences.js";

/** Every counter has the Hard bit set, so every mark is done. */
const DONE_COUNTERS: readonly number[] = Array.from(
  { length: 4000 },
  () => 0b10,
);

/** A model where the given marks of the given characters are not done. */
function modelMissing(
  missing: Readonly<Record<string, readonly string[]>>,
): MarksModel {
  const full = getMarks(DONE_COUNTERS);

  return {
    marks: full.marks,
    characters: full.characters.map((character) => ({
      ...character,
      marks: character.marks.map((entry) => ({
        ...entry,
        unlocked: !(missing[character.id] ?? []).includes(entry.mark.id),
      })),
    })),
  };
}

const SOME_MISSING = modelMissing({
  taintedLilith: ["hush", "megaSatan", "mother", "beast"],
  taintedKeeper: ["ultraGreedier"],
  isaac: ["momsHeart"],
});

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

describe("getCharacterGroups", () => {
  test("splits the characters into regular and tainted with their counts", () => {
    const [regular, tainted] = getCharacterGroups(SOME_MISSING);
    expect(regular?.id).toBe("regular");
    expect(tainted?.id).toBe("tainted");
    expect(regular?.summaries).toHaveLength(17);
    expect(tainted?.summaries).toHaveLength(17);
    expect(regular?.total).toBe(204);
    expect(tainted?.total).toBe(204);
    expect(regular?.done).toBe(203);
    expect(tainted?.done).toBe(204 - 5);
  });

  test("a complete save has every mark done", () => {
    const groups = getCharacterGroups(modelMissing({}));
    expect(groups.map((group) => group.done)).toStrictEqual([204, 204]);
    expect(getIncomplete(groups)).toStrictEqual([]);
  });
});

describe("summarizeCharacter", () => {
  test("lists the missing marks in column order", () => {
    const lilith = SOME_MISSING.characters.find(
      (character) => character.id === "taintedLilith",
    );
    expect(lilith).toBeDefined();
    if (lilith === undefined) {
      return;
    }

    const summary = summarizeCharacter(lilith);
    expect(summary.done).toBe(8);
    expect(summary.total).toBe(12);
    expect(summary.complete).toBe(false);
    expect(summary.missing).toStrictEqual([
      "Hush",
      "Mega Satan",
      "Mother",
      "The Beast",
    ]);
    expect(characterSummaryText(summary)).toBe(
      "Tainted Lilith, 8 of 12 hard marks; missing: Hush, Mega Satan, Mother, The Beast",
    );
  });

  test("a complete character has no missing list", () => {
    const [first] = modelMissing({}).characters;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }

    const summary = summarizeCharacter(first);
    expect(summary.complete).toBe(true);
    expect(characterSummaryText(summary)).toBe(
      `${first.name}, 12 of 12 hard marks`,
    );
  });
});

describe("getIncomplete and filterSummaries", () => {
  const groups = getCharacterGroups(SOME_MISSING);

  test("getIncomplete is in character select order", () => {
    expect(
      getIncomplete(groups).map(({ character }) => character.id),
    ).toStrictEqual(["isaac", "taintedLilith", "taintedKeeper"]);
  });

  test("the filter keeps everything or only the incomplete characters", () => {
    const [regular] = groups;
    expect(regular).toBeDefined();
    if (regular === undefined) {
      return;
    }

    expect(filterSummaries(regular.summaries, "all")).toHaveLength(17);
    expect(
      filterSummaries(regular.summaries, "incomplete").map(
        ({ character }) => character.id,
      ),
    ).toStrictEqual(["isaac"]);
  });

  test("stillToDoText counts marks and characters", () => {
    expect(stillToDoText(getIncomplete(groups))).toBe(
      "6 marks left across 3 characters",
    );
    expect(
      stillToDoText(
        getIncomplete(getCharacterGroups(modelMissing({ isaac: ["lamb"] }))),
      ),
    ).toBe("1 mark left across 1 character");
  });
});

describe("visibleCharacterName", () => {
  test("drops the Tainted prefix only for tainted characters", () => {
    const names = Object.fromEntries(
      SOME_MISSING.characters.map((character) => [
        character.id,
        visibleCharacterName(character),
      ]),
    );
    expect(names["taintedLilith"]).toBe("Lilith");
    expect(names["lilith"]).toBe("Lilith");
    expect(names["isaac"]).toBe("Isaac");
  });
});

describe("the marks filter preference", () => {
  test("defaults to all and remembers the choice as isv:marks:show", () => {
    const storage = memoryStorage();
    const preferences = new Preferences(storage);
    expect(preferences.getMarksShow()).toBe(DEFAULT_MARKS_SHOW);
    expect(DEFAULT_MARKS_SHOW).toBe("all");

    preferences.setMarksShow("incomplete");
    expect(storage.items.get("isv:marks:show")).toBe("incomplete");
    expect(new Preferences(storage).getMarksShow()).toBe("incomplete");
  });

  test("ignores an invalid stored value and works without storage", () => {
    const storage = memoryStorage();
    storage.setItem("isv:marks:show", "everything");
    expect(new Preferences(storage).getMarksShow()).toBe("all");
    expect(isMarksShow("incomplete")).toBe(true);
    expect(isMarksShow("locked")).toBe(false);

    const preferences = new Preferences(undefined);
    preferences.setMarksShow("incomplete");
    expect(preferences.getMarksShow()).toBe("all");
  });
});
