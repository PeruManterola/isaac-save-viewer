// Turns a parsed save file into the data that the page shows. This module does not touch the page.

import { parseIntSafe } from "complete-common";
import achievementsJSON from "../data/achievements.json";
import itemPoolsJSON from "../data/itempools.json";
import itemsJSON from "../data/items.json";
import { ChunkType } from "../enums/ChunkType.js";
import { ITEM_POOL_NAME_MAP } from "../itemPoolNameMap.js";
import type IsaacSaveFile from "../kaitai/IsaacSaveFile.cjs";
import type {
  AchievementsChunk,
  ChallengeCountersChunk,
  CollectiblesChunk,
  CountersChunk,
} from "../kaitai/IsaacSaveFile.cjs";
import type { Category } from "./categories.js";
import { isCategory } from "./categories.js";
import type { MarksModel } from "./marks.js";
import { getMarks } from "./marks.js";
import { getChunkBody } from "./parse.js";

/** Valid collectible IDs are between these values (inclusive). Other keys are not collectibles. */
const MIN_COLLECTIBLE_ID = 1;
const MAX_COLLECTIBLE_ID = 999;

/** The key of the entry used for achievements that are not in "achievements.json". */
const UNKNOWN_ACHIEVEMENT_KEY = "NEW";

interface AchievementJSON {
  link: string;
  name: string;
  inGameDescription: string;
  unlockDescription: string;
  category: string;
}

interface ItemJSON {
  name?: unknown;
}

export interface AchievementEntry {
  readonly id: number;
  readonly name: string;
  /** The wiki page slug, or an empty string if there is no page. */
  readonly link: string;
  readonly inGameDescription: string;
  readonly unlockDescription: string;
  readonly category: Category;
  /** The path of the icon relative to the site root, or undefined if there is no icon. */
  readonly icon: string | undefined;
  readonly unlocked: boolean;
}

export interface ItemEntry {
  readonly id: number;
  readonly name: string;
  /** The path of the icon relative to the site root. */
  readonly icon: string;
  /** The names of the item pools that contain the item. */
  readonly pools: readonly string[];
  /** Whether the item has been touched. */
  readonly unlocked: boolean;
}

export interface Progress {
  readonly unlocked: number;
  readonly total: number;
}

export interface SaveModel {
  /** Sorted by ID. */
  readonly achievements: readonly AchievementEntry[];
  /** Sorted by ID. */
  readonly items: readonly ItemEntry[];
  readonly challenges: Progress;
  /** The Hard completion marks of every character. */
  readonly marks: MarksModel;
}

export function createSaveModel(isaacSaveFile: IsaacSaveFile): SaveModel {
  return {
    achievements: getAchievements(isaacSaveFile),
    items: getItems(isaacSaveFile),
    challenges: getChallenges(isaacSaveFile),
    marks: getMarksFromSave(isaacSaveFile),
  };
}

export function getProgress(
  entries: ReadonlyArray<{ readonly unlocked: boolean }>,
): Progress {
  return {
    unlocked: entries.filter((entry) => entry.unlocked).length,
    total: entries.length,
  };
}

export function getMarksProgress(marksModel: MarksModel): Progress {
  return getProgress(
    marksModel.characters.flatMap((character) => character.marks),
  );
}

function getAchievements(
  isaacSaveFile: IsaacSaveFile,
): readonly AchievementEntry[] {
  const { achievements } = getChunkBody(
    isaacSaveFile,
    ChunkType.ACHIEVEMENTS,
  ) as AchievementsChunk;
  const allAchievementsJSON = achievementsJSON as Record<
    string,
    AchievementJSON | undefined
  >;
  const unknownAchievement = allAchievementsJSON[UNKNOWN_ACHIEVEMENT_KEY];
  if (unknownAchievement === undefined) {
    throw new Error(
      `Failed to find the "${UNKNOWN_ACHIEVEMENT_KEY}" entry in "achievements.json".`,
    );
  }

  // There is no 0th achievement, so we skip the first element.
  return achievements.slice(1).map((value, index) => {
    const id = index + 1;
    const achievementJSON = allAchievementsJSON[id.toString()];
    const { name, link, inGameDescription, unlockDescription, category } =
      achievementJSON ?? unknownAchievement;
    if (!isCategory(category)) {
      throw new Error(
        `Achievement ${id} has an unknown category in "achievements.json": ${category}`,
      );
    }

    return {
      id,
      name,
      link,
      inGameDescription,
      unlockDescription,
      category,
      icon:
        achievementJSON === undefined
          ? undefined
          : `img/achievements/${id}.png`,
      unlocked: value !== 0,
    };
  });
}

function getItems(isaacSaveFile: IsaacSaveFile): readonly ItemEntry[] {
  const { seenById } = getChunkBody(
    isaacSaveFile,
    ChunkType.COLLECTIBLES,
  ) as CollectiblesChunk;
  const poolsByItemID = getPoolsByItemID();

  const items: ItemEntry[] = [];
  for (const [key, itemJSON] of Object.entries(
    itemsJSON as Record<string, ItemJSON>,
  )) {
    const id = parseIntSafe(key);
    if (
      id === undefined
      || id < MIN_COLLECTIBLE_ID
      || id > MAX_COLLECTIBLE_ID
    ) {
      continue;
    }

    const { name } = itemJSON;
    if (typeof name !== "string") {
      throw new TypeError(
        `Collectible ${id} did not have a name in the JSON description.`,
      );
    }

    items.push({
      id,
      name,
      icon: `img/collectibles/collectibles_${id.toString().padStart(3, "0")}.png`,
      pools: poolsByItemID.get(id) ?? [],
      unlocked: (seenById[id] ?? 0) !== 0,
    });
  }

  items.sort((a, b) => a.id - b.id);
  return items;
}

/** The "itempools.json" file was converted from the game's "itempools.xml" file. */
function getPoolsByItemID(): ReadonlyMap<number, readonly string[]> {
  const poolsByItemID = new Map<number, string[]>();

  for (const pool of itemPoolsJSON.ItemPools.Pool) {
    // Convert e.g. "bossRoom" to "Boss Room".
    const poolName = ITEM_POOL_NAME_MAP.get(pool._Name) ?? "Unknown";

    for (const item of pool.Item) {
      const itemID = parseIntSafe(item._Id);
      if (itemID === undefined) {
        continue;
      }

      let pools = poolsByItemID.get(itemID);
      if (pools === undefined) {
        pools = [];
        poolsByItemID.set(itemID, pools);
      }

      // An item could appear more than once in the same pool, but we only list each pool once.
      if (!pools.includes(poolName)) {
        pools.push(poolName);
      }
    }
  }

  return poolsByItemID;
}

function getChallenges(isaacSaveFile: IsaacSaveFile): Progress {
  const { completedById } = getChunkBody(
    isaacSaveFile,
    ChunkType.CHALLENGE_COUNTERS,
  ) as ChallengeCountersChunk;

  // There is no 0th challenge, so we skip the first element.
  return getProgress(
    completedById.slice(1).map((value) => ({ unlocked: value !== 0 })),
  );
}

function getMarksFromSave(isaacSaveFile: IsaacSaveFile): MarksModel {
  const { counters } = getChunkBody(
    isaacSaveFile,
    ChunkType.COUNTERS,
  ) as CountersChunk;

  return getMarks(counters);
}
