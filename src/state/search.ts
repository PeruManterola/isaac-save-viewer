// Search for the achievements and items sections. These are pure functions, so they can be tested
// without a page.

/** Lowercases, removes diacritics (so "Pokémon" matches "pokemon"), and collapses whitespace. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/\s+/g, " ")
    .trim();
}

/** Joins the parts that can be searched into one normalized string. */
export function buildSearchText(...parts: readonly string[]): string {
  return normalizeText(parts.join(" "));
}

export interface SearchQuery {
  /** What the user typed, trimmed. Used to show the query back to them. */
  readonly text: string;
  /** The normalized words. Every word must match. */
  readonly words: readonly string[];
}

export const EMPTY_QUERY = { text: "", words: [] } as const;

export function parseQuery(input: string): SearchQuery {
  const normalized = normalizeText(input);
  return {
    text: input.trim(),
    words: normalized === "" ? [] : normalized.split(" "),
  };
}

export function isQueryActive(query: SearchQuery): boolean {
  return query.words.length > 0;
}

export function isSameQuery(a: SearchQuery, b: SearchQuery): boolean {
  return a.words.join(" ") === b.words.join(" ");
}

interface Searchable {
  readonly id: number;
  /** Built with `buildSearchText`. */
  readonly searchText: string;
}

/**
 * Whether the entry matches. Every word of the query must match, in any order. A word matches if it
 * is part of the text. A number (optionally with a leading "#") also matches the exact ID. An empty
 * query matches everything.
 */
export function matchesQuery(query: SearchQuery, entry: Searchable): boolean {
  return query.words.every((word) => matchesWord(word, entry));
}

function matchesWord(word: string, entry: Searchable): boolean {
  const idMatch = /^(?<hash>#?)(?<digits>\d+)$/.exec(word);
  if (idMatch?.groups !== undefined) {
    const { hash, digits } = idMatch.groups;
    if (digits === entry.id.toString()) {
      return true;
    }

    // "#12" only means an ID, but "12" can also be part of a name, like "20/20".
    if (hash === "#") {
      return false;
    }
  }

  return entry.searchText.includes(word);
}
