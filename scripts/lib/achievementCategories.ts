// Assigns each achievement to one of the 6 groups shown on the page.

// cspell:words Greedier

import {
  CHARACTER_DEFINITIONS,
  NON_TAINTED_CHARACTER_TEXT_NAMES,
} from "./marksDefinition.js";

/** The category ids, in the order that the groups are shown on the page. */
export const ACHIEVEMENT_CATEGORIES = [
  "characterUnlock",
  "characterMark",
  "tainted",
  "challenge",
  "dailyOnline",
  "misc",
] as const;

type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

interface AchievementText {
  readonly id: number;
  readonly name: string;
  readonly unlockDescription: string;
}

/**
 * Achievements where the rules below give the wrong answer. Keep this list short and give a reason
 * for each entry; `scrape-achievements.ts` fails if an override matches what the rules already
 * return.
 */
export const CATEGORY_OVERRIDES: ReadonlyMap<
  number,
  { readonly category: AchievementCategory; readonly reason: string }
> = new Map([
  [
    276,
    {
      category: "characterMark",
      reason:
        "Mega: Mega Satan mark with every non-tainted character; no single character is named.",
    },
  ],
  [
    547,
    {
      category: "characterMark",
      reason:
        "Mega Mush: all Hard marks for all non-tainted characters; no single character is named.",
    },
  ],
  [
    636,
    {
      category: "tainted",
      reason:
        "Death Certificate: all Hard marks for every character including tainted ones; it is the capstone of the tainted marks.",
    },
  ],
]);

function escapeRegExp(text: string): string {
  return text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

const NON_TAINTED_CHARACTER_NAMES: ReadonlySet<string> = new Set(
  NON_TAINTED_CHARACTER_TEXT_NAMES,
);

/** E.g. "Defeat Isaac as Cain", "Complete the Boss Rush as ???". */
const AS_NON_TAINTED_CHARACTER_REGEX = new RegExp(
  String.raw`\bas (?:${NON_TAINTED_CHARACTER_TEXT_NAMES.map((name) => escapeRegExp(name)).join("|")})(?=$|[\s,.;)])`,
);

/** E.g. "Defeat The Beast as Tainted Lost", "Unlock Tainted Cain". */
const TAINTED_CHARACTER_REGEX = new RegExp(
  String.raw`\b(?:${CHARACTER_DEFINITIONS.filter(
    (character) => character.tainted,
  )
    .map((character) => escapeRegExp(character.name))
    .join("|")})(?=$|[\s,.;)])`,
);

/** Tainted characters are unlocked by opening the closet in Home as their non-tainted version. */
const TAINTED_UNLOCK_REGEX = /\bhidden closet in Home as /;

/** E.g. "Complete Pitch Black (challenge #1)". */
const CHALLENGE_REWARD_REGEX = /^Complete .+ \(challenge #\d+\)$/;

const DAILY_ONLINE_REGEX = /\bDaily Challenges?\b|\bOnline\b/;

/** Returns the category from the rules alone, ignoring the overrides. */
export function getRuleCategory(
  achievement: AchievementText,
): AchievementCategory {
  const { name, unlockDescription } = achievement;

  if (NON_TAINTED_CHARACTER_NAMES.has(name)) {
    return "characterUnlock";
  }

  if (
    TAINTED_CHARACTER_REGEX.test(unlockDescription)
    || TAINTED_UNLOCK_REGEX.test(unlockDescription)
  ) {
    return "tainted";
  }

  if (CHALLENGE_REWARD_REGEX.test(unlockDescription)) {
    return "challenge";
  }

  if (DAILY_ONLINE_REGEX.test(unlockDescription)) {
    return "dailyOnline";
  }

  if (AS_NON_TAINTED_CHARACTER_REGEX.test(unlockDescription)) {
    return "characterMark";
  }

  return "misc";
}

export function getCategory(achievement: AchievementText): AchievementCategory {
  return (
    CATEGORY_OVERRIDES.get(achievement.id)?.category
    ?? getRuleCategory(achievement)
  );
}
