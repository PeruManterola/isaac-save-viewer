// The pure logic behind the completion marks section: which characters are missing which marks, how
// the characters are grouped, and the texts that summarize them. No DOM in here.

import type { MarksModel } from "../save/marks.js";

type CharacterMarks = MarksModel["characters"][number];

const MARKS_SHOWS = ["all", "incomplete"] as const;
export type MarksShow = (typeof MARKS_SHOWS)[number];

export const DEFAULT_MARKS_SHOW: MarksShow = "all";

export function isMarksShow(value: unknown): value is MarksShow {
  return MARKS_SHOWS.includes(value as MarksShow);
}

export interface CharacterSummary {
  readonly character: CharacterMarks;
  readonly done: number;
  readonly total: number;
  /** The names of the marks that are not done, in column order. */
  readonly missing: readonly string[];
  readonly complete: boolean;
}

export function summarizeCharacter(
  character: CharacterMarks,
): CharacterSummary {
  const missing = character.marks
    .filter(({ unlocked }) => !unlocked)
    .map(({ mark }) => mark.name);
  const total = character.marks.length;

  return {
    character,
    done: total - missing.length,
    total,
    missing,
    complete: missing.length === 0,
  };
}

export interface CharacterGroup {
  readonly id: "regular" | "tainted";
  readonly title: string;
  readonly summaries: readonly CharacterSummary[];
  /** The number of marks that are done, and the number there are, in this group. */
  readonly done: number;
  readonly total: number;
}

/** The characters in character select order: the regular ones, then the tainted ones. */
export function getCharacterGroups(
  marksModel: MarksModel,
): readonly CharacterGroup[] {
  const summaries = marksModel.characters.map((character) =>
    summarizeCharacter(character),
  );

  return [
    makeGroup(
      "regular",
      "Regular characters",
      summaries.filter(({ character }) => !character.tainted),
    ),
    makeGroup(
      "tainted",
      "Tainted characters",
      summaries.filter(({ character }) => character.tainted),
    ),
  ];
}

function makeGroup(
  id: CharacterGroup["id"],
  title: string,
  summaries: readonly CharacterSummary[],
): CharacterGroup {
  return {
    id,
    title,
    summaries,
    done: summaries.reduce((sum, summary) => sum + summary.done, 0),
    total: summaries.reduce((sum, summary) => sum + summary.total, 0),
  };
}

export function filterSummaries(
  summaries: readonly CharacterSummary[],
  show: MarksShow,
): readonly CharacterSummary[] {
  return show === "all"
    ? summaries
    : summaries.filter(({ complete }) => !complete);
}

/** The characters that still have marks to do, in character select order. */
export function getIncomplete(
  groups: readonly CharacterGroup[],
): readonly CharacterSummary[] {
  return groups.flatMap((group) =>
    filterSummaries(group.summaries, "incomplete"),
  );
}

/**
 * The name that is shown on a card. Inside the tainted group the "Tainted " prefix is dropped,
 * because the group heading already says it. The accessible name keeps the full name.
 */
export function visibleCharacterName(character: CharacterMarks): string {
  return character.tainted
    ? character.name.replace(/^Tainted /, "")
    : character.name;
}

/** E.g. "Tainted Lilith, 8 of 12 hard marks; missing: Hush, Mega Satan, Mother, The Beast". */
export function characterSummaryText(summary: CharacterSummary): string {
  const { character, done, total, missing } = summary;
  const base = `${character.name}, ${done} of ${total} hard marks`;

  return missing.length === 0
    ? base
    : `${base}; missing: ${missing.join(", ")}`;
}

/** E.g. "7 marks left across 2 characters". */
export function stillToDoText(incomplete: readonly CharacterSummary[]): string {
  const marks = incomplete.reduce(
    (sum, summary) => sum + summary.missing.length,
    0,
  );

  return `${plural(marks, "mark")} left across ${plural(incomplete.length, "character")}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
