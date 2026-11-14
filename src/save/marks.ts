// Completion marks. They are stored as event counters in the COUNTERS chunk of the save file.

import marksJSON from "../data/marks.json";

/**
 * The low 2 bits of a mark counter hold the offline mark: 1 is Normal and 2 is Hard (Ultra Greedier
 * in the Greed column). The higher bits hold Repentance+ online marks, which we ignore. See
 * `GetOfflineMark` in REPENTOGON's "CompletionTracker.cpp".
 */
const HARD_MARK_BIT = 0b10;

interface Mark {
  readonly id: string;
  readonly name: string;
  /** The path of the icon relative to the site root. */
  readonly icon: string;
}

interface MarkEntry {
  readonly mark: Mark;
  /** Whether the mark is done on Hard. */
  readonly unlocked: boolean;
}

interface CharacterMarks {
  readonly id: string;
  readonly name: string;
  readonly tainted: boolean;
  /** The path of the icon relative to the site root. */
  readonly icon: string;
  /** In the same order as the columns. */
  readonly marks: readonly MarkEntry[];
}

export interface MarksModel {
  /** The columns of the grid. */
  readonly marks: readonly Mark[];
  /** The rows of the grid, in character select screen order. */
  readonly characters: readonly CharacterMarks[];
}

export function isHardMarkDone(counterValue: number): boolean {
  // eslint-disable-next-line no-bitwise
  return (counterValue & HARD_MARK_BIT) !== 0;
}

export function getMarks(counters: readonly number[]): MarksModel {
  const { marks } = marksJSON;

  const characters = marksJSON.characters.map((character) => {
    const characterCounters = character.counters as Record<
      string,
      number | undefined
    >;

    return {
      id: character.id,
      name: character.name,
      tainted: character.tainted,
      icon: character.icon,
      marks: marks.map((mark) => {
        const counterIndex = characterCounters[mark.id];
        if (counterIndex === undefined) {
          throw new Error(
            `Character "${character.id}" has no counter for the "${mark.id}" mark in "marks.json".`,
          );
        }

        return {
          mark,
          unlocked: isHardMarkDone(counters[counterIndex] ?? 0),
        };
      }),
    };
  });

  return { marks, characters };
}
