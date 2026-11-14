// cspell:disable
import { describe, expect, test } from "vitest";
import {
  buildSearchText,
  EMPTY_QUERY,
  isQueryActive,
  isSameQuery,
  matchesQuery,
  normalizeText,
  parseQuery,
} from "../src/state/search.js";

function entry(
  id: number,
  ...parts: readonly string[]
): Readonly<{ id: number; searchText: string }> {
  return { id, searchText: buildSearchText(...parts) };
}

const EPIC_FETUS = entry(
  20,
  "Epic Fetus",
  "Beat Mother as Isaac",
  "Rockets from above!",
);
const PIE = entry(
  105,
  "Crème Brûlée",
  "Pokémon Pool Item",
  "Treasure Room, Boss Room",
);
const TWENTY_TWENTY = entry(245, "20/20", "Treasure Room");

describe("normalizeText", () => {
  test("lowercases", () => {
    expect(normalizeText("Epic FETUS")).toBe("epic fetus");
  });

  test("removes diacritics", () => {
    expect(normalizeText("Crème Brûlée Pokémon")).toBe("creme brulee pokemon");
    expect(normalizeText("Ñandú")).toBe("nandu");
  });

  test("collapses and trims whitespace", () => {
    expect(normalizeText("  epic \t  fetus\n")).toBe("epic fetus");
  });

  test("keeps punctuation", () => {
    expect(normalizeText("Mom's Knife")).toBe("mom's knife");
  });
});

describe("parseQuery", () => {
  test("splits into normalized words", () => {
    expect(parseQuery("  Epic   FÉTUS ")).toStrictEqual({
      text: "Epic   FÉTUS",
      words: ["epic", "fetus"],
    });
  });

  test("an empty or blank query has no words", () => {
    expect(parseQuery("")).toStrictEqual(EMPTY_QUERY);
    expect(parseQuery("   ").words).toStrictEqual([]);
    expect(isQueryActive(parseQuery("  "))).toBe(false);
    expect(isQueryActive(parseQuery("a"))).toBe(true);
  });

  test("queries that only differ in case, spacing, or accents are the same", () => {
    expect(
      isSameQuery(parseQuery("epic fetus"), parseQuery(" EPIC  fetus ")),
    ).toBe(true);
    expect(isSameQuery(parseQuery("crème"), parseQuery("creme"))).toBe(true);
    expect(isSameQuery(parseQuery("epic"), parseQuery("epic fetus"))).toBe(
      false,
    );
  });
});

describe("matchesQuery", () => {
  test("an empty query matches everything", () => {
    expect(matchesQuery(EMPTY_QUERY, EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("   "), PIE)).toBe(true);
  });

  test("ignores case", () => {
    expect(matchesQuery(parseQuery("EPIC"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("mother"), EPIC_FETUS)).toBe(true);
  });

  test("ignores diacritics in the query and in the text", () => {
    expect(matchesQuery(parseQuery("creme brulee"), PIE)).toBe(true);
    expect(matchesQuery(parseQuery("crème brûlée"), PIE)).toBe(true);
    expect(matchesQuery(parseQuery("pokemon"), PIE)).toBe(true);
    expect(matchesQuery(parseQuery("pokémon"), PIE)).toBe(true);
  });

  test("matches part of a word", () => {
    expect(matchesQuery(parseQuery("fet"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("rocket"), EPIC_FETUS)).toBe(true);
  });

  test("every word has to match, in any order, in any field", () => {
    expect(matchesQuery(parseQuery("epic fetus"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("fetus epic"), EPIC_FETUS)).toBe(true);
    // One word is in the name, the other in the requirement.
    expect(matchesQuery(parseQuery("epic isaac"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("epic brimstone"), EPIC_FETUS)).toBe(false);
  });

  test("a word that is nowhere does not match", () => {
    expect(matchesQuery(parseQuery("zzz"), EPIC_FETUS)).toBe(false);
  });

  test("matches the exact ID, with or without #", () => {
    expect(matchesQuery(parseQuery("20"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("#20"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("105"), PIE)).toBe(true);
    expect(matchesQuery(parseQuery("#105"), PIE)).toBe(true);
  });

  test("a number is not matched against part of an ID", () => {
    expect(matchesQuery(parseQuery("10"), PIE)).toBe(false);
    expect(matchesQuery(parseQuery("5"), PIE)).toBe(false);
    expect(matchesQuery(parseQuery("#10"), PIE)).toBe(false);
  });

  test("a number without # can also be part of the text, but with # only the ID counts", () => {
    expect(matchesQuery(parseQuery("20"), TWENTY_TWENTY)).toBe(true);
    expect(matchesQuery(parseQuery("#20"), TWENTY_TWENTY)).toBe(false);
    expect(matchesQuery(parseQuery("#245"), TWENTY_TWENTY)).toBe(true);
  });

  test("an ID and words can be combined", () => {
    expect(matchesQuery(parseQuery("#20 epic"), EPIC_FETUS)).toBe(true);
    expect(matchesQuery(parseQuery("#21 epic"), EPIC_FETUS)).toBe(false);
  });

  test("the ID is not part of the searchable text", () => {
    expect(EPIC_FETUS.searchText).not.toContain("20 ");
  });
});
