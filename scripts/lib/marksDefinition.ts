// The completion marks grid: 12 marks (columns) × 34 characters (rows).

// cspell:words BOSSRUSH Greedier REPENTOGON spritesheet

interface MarkDefinition {
  readonly id: string;
  readonly name: string;
  /** The part of the REPENTOGON `EventCounter` name before `_WITH_`, without `PROGRESSION_`. */
  readonly counterPrefix: string;
  /**
   * Where the 16×16 Hard icon comes from: either a wiki file, or a cell of the Repentance+ online
   * lobby spritesheet (the game has no separate Delirium mark icon; on the post-it, Delirium turns
   * the whole note red).
   */
  readonly iconSource:
    | { readonly kind: "file"; readonly fileName: string }
    | { readonly kind: "sheet"; readonly column: number; readonly row: number };
}

/** The column order of the completion marks grid. */
export const MARK_DEFINITIONS = [
  {
    id: "momsHeart",
    name: "Mom's Heart",
    counterPrefix: "KILL_MOMS_HEART",
    iconSource: { kind: "file", fileName: "Completion_Heart_Hard.png" },
  },
  {
    id: "isaac",
    name: "Isaac",
    counterPrefix: "KILL_ISAAC",
    iconSource: { kind: "file", fileName: "Completion_Cathedral_Hard.png" },
  },
  {
    id: "satan",
    name: "Satan",
    counterPrefix: "KILL_SATAN",
    iconSource: { kind: "file", fileName: "Completion_Sheol_Hard.png" },
  },
  {
    id: "blueBaby",
    name: "???",
    counterPrefix: "KILL_BLUE_BABY",
    iconSource: { kind: "file", fileName: "Completion_Chest_Hard.png" },
  },
  {
    id: "lamb",
    name: "The Lamb",
    counterPrefix: "KILL_THE_LAMB",
    iconSource: { kind: "file", fileName: "Completion_DarkRoom_Hard.png" },
  },
  {
    id: "bossRush",
    name: "Boss Rush",
    counterPrefix: "BOSSRUSH_CLEARED",
    iconSource: { kind: "file", fileName: "Completion_BossRush_Hard.png" },
  },
  {
    id: "hush",
    name: "Hush",
    counterPrefix: "KILL_HUSH",
    iconSource: { kind: "file", fileName: "Completion_BlueWomb_Hard.png" },
  },
  {
    id: "megaSatan",
    name: "Mega Satan",
    counterPrefix: "KILL_MEGA_SATAN",
    iconSource: { kind: "file", fileName: "Completion_Brimstone_Hard.png" },
  },
  {
    id: "delirium",
    name: "Delirium",
    counterPrefix: "KILL_DELIRIUM",
    iconSource: { kind: "sheet", column: 2, row: 3 },
  },
  {
    id: "mother",
    name: "Mother",
    counterPrefix: "KILL_MOTHER",
    iconSource: { kind: "file", fileName: "Completion_Mother_Hard.png" },
  },
  {
    id: "beast",
    name: "The Beast",
    counterPrefix: "KILL_BEAST",
    iconSource: { kind: "file", fileName: "Completion_Beast_Hard.png" },
  },
  {
    id: "ultraGreedier",
    name: "Ultra Greedier",
    counterPrefix: "GREED_MODE_CLEARED",
    iconSource: { kind: "file", fileName: "Completion_Greed_Hard.png" },
  },
] as const satisfies readonly MarkDefinition[];

/** The wiki file holding the Repentance+ online lobby completion mark icons (16×16 cells). */
export const MARK_SHEET_FILE_NAME = "Online_lobby_completion_marks.png";
export const MARK_ICON_SIZE = 16;

interface BaseCharacter {
  readonly id: string;
  readonly name: string;
  /** The part of the REPENTOGON `EventCounter` name after `_WITH_` (and after `T_` if tainted). */
  readonly counterSuffix: string;
  /** The name of the character's 32×32 icon on the wiki, between "Character " and " icon.png". */
  readonly wikiIconName: string;
  /** The name used for the tainted version in achievement texts and on the wiki. */
  readonly taintedName: string;
}

/** The non-tainted characters, in the order of the character select screen. */
const BASE_CHARACTERS = [
  {
    id: "isaac",
    name: "Isaac",
    counterSuffix: "ISAAC",
    wikiIconName: "Isaac",
    taintedName: "Tainted Isaac",
  },
  {
    id: "magdalene",
    name: "Magdalene",
    counterSuffix: "MAGDALENE",
    wikiIconName: "Magdalene",
    taintedName: "Tainted Magdalene",
  },
  {
    id: "cain",
    name: "Cain",
    counterSuffix: "CAIN",
    wikiIconName: "Cain",
    taintedName: "Tainted Cain",
  },
  {
    id: "judas",
    name: "Judas",
    counterSuffix: "JUDAS",
    wikiIconName: "Judas",
    taintedName: "Tainted Judas",
  },
  {
    id: "blueBaby",
    name: "???",
    counterSuffix: "BLUE_BABY",
    wikiIconName: "???",
    taintedName: "Tainted ???",
  },
  {
    id: "eve",
    name: "Eve",
    counterSuffix: "EVE",
    wikiIconName: "Eve",
    taintedName: "Tainted Eve",
  },
  {
    id: "samson",
    name: "Samson",
    counterSuffix: "SAMSON",
    wikiIconName: "Samson",
    taintedName: "Tainted Samson",
  },
  {
    id: "azazel",
    name: "Azazel",
    counterSuffix: "AZAZEL",
    wikiIconName: "Azazel",
    taintedName: "Tainted Azazel",
  },
  {
    id: "lazarus",
    name: "Lazarus",
    counterSuffix: "LAZARUS",
    wikiIconName: "Lazarus",
    taintedName: "Tainted Lazarus",
  },
  {
    id: "eden",
    name: "Eden",
    counterSuffix: "EDEN",
    wikiIconName: "Eden",
    taintedName: "Tainted Eden",
  },
  {
    id: "theLost",
    name: "The Lost",
    counterSuffix: "THE_LOST",
    wikiIconName: "The Lost",
    taintedName: "Tainted Lost",
  },
  {
    id: "lilith",
    name: "Lilith",
    counterSuffix: "LILITH",
    wikiIconName: "Lilith",
    taintedName: "Tainted Lilith",
  },
  {
    id: "keeper",
    name: "Keeper",
    counterSuffix: "KEEPER",
    wikiIconName: "Keeper",
    taintedName: "Tainted Keeper",
  },
  {
    id: "apollyon",
    name: "Apollyon",
    counterSuffix: "APOLLYON",
    wikiIconName: "Apollyon",
    taintedName: "Tainted Apollyon",
  },
  {
    id: "theForgotten",
    name: "The Forgotten",
    counterSuffix: "THE_FORGOTTEN",
    wikiIconName: "The Forgotten",
    taintedName: "Tainted Forgotten",
  },
  {
    id: "bethany",
    name: "Bethany",
    counterSuffix: "BETHANY",
    wikiIconName: "Bethany",
    taintedName: "Tainted Bethany",
  },
  {
    id: "jacobAndEsau",
    name: "Jacob & Esau",
    counterSuffix: "JACOB_AND_ESAU",
    wikiIconName: "Jacob and Esau",
    taintedName: "Tainted Jacob",
  },
] as const satisfies readonly BaseCharacter[];

interface CharacterDefinition {
  readonly id: string;
  readonly name: string;
  readonly tainted: boolean;
  /** The full REPENTOGON `EventCounter` suffix, e.g. "T_THE_LOST". */
  readonly counterSuffix: string;
  /** The file name of the character's icon on the wiki. */
  readonly wikiIconFileName: string;
}

/** The row order of the completion marks grid: the 17 characters, then their tainted versions. */
export const CHARACTER_DEFINITIONS = [
  ...BASE_CHARACTERS.map((character) => ({
    id: character.id,
    name: character.name,
    tainted: false,
    counterSuffix: character.counterSuffix,
    wikiIconFileName: `Character ${character.wikiIconName} icon.png`,
  })),
  ...BASE_CHARACTERS.map((character) => ({
    id: `tainted${character.id.charAt(0).toUpperCase()}${character.id.slice(1)}`,
    name: character.taintedName,
    tainted: true,
    counterSuffix: `T_${character.counterSuffix}`,
    wikiIconFileName: `Character ${character.taintedName} icon.png`,
  })),
] as const satisfies readonly CharacterDefinition[];

/**
 * The names of the non-tainted characters as written in achievement texts on the wiki (where Jacob
 * & Esau is spelled "Jacob and Esau").
 */
export const NON_TAINTED_CHARACTER_TEXT_NAMES: readonly string[] =
  BASE_CHARACTERS.map((character) => character.wikiIconName);
