// The text and the empty state of a search that finds nothing.

import type { SearchQuery } from "../state/search.js";
import { h } from "./dom.js";
import { icon } from "./icons.js";
import { button } from "./ui.js";

/** E.g. "12 matches". */
export function matchesText(count: number): string {
  return `${count} ${count === 1 ? "match" : "matches"}`;
}

/** E.g. "12 matches for “epic”". Also read out by the toolbar's live region. */
export function matchCountText(count: number, query: SearchQuery): string {
  if (count === 0) {
    return `No matches for “${query.text}”`;
  }

  return `${matchesText(count)} for “${query.text}”`;
}

interface NoMatches {
  readonly element: HTMLElement;
  /**
   * @param query What was searched for.
   * @param filterNote Which filter is on, if it is not "All". Then a button can turn it off.
   */
  readonly update: (query: SearchQuery, filterNote: string | undefined) => void;
}

/** One quiet card that replaces all the results when nothing matches. */
export function createNoMatches(
  onClearSearch: () => void,
  onShowAll: () => void,
): NoMatches {
  const title = h("p", { class: "no-matches-title" });
  const hint = h("p", { class: "muted small" });
  const showAll = button({ label: "Show all", onClick: onShowAll });
  const element = h("div", { class: "card no-matches", hidden: "" }, [
    icon("search"),
    h("div", { class: "no-matches-text" }, [title, hint]),
    h("div", { class: "no-matches-actions" }, [
      button({
        label: "Clear search",
        variant: "primary",
        onClick: onClearSearch,
      }),
      showAll,
    ]),
  ]);

  return {
    element,
    update: (query, filterNote) => {
      title.textContent = matchCountText(0, query);
      hint.textContent =
        filterNote === undefined
          ? "Check the spelling, or try fewer words."
          : `${filterNote} Check the spelling, or show everything.`;
      showAll.hidden = filterNote === undefined;
    },
  };
}
