// Checks "src/data/achievements.json", "src/data/marks.json" and their icons, then counts the Hard
// completion marks in save files.

// Usage: npx tsx scripts/validate-data.ts [save file or directory...]

// With no arguments, it reads every "*.dat" file in the "saves" directory at the repository root
// (which is gitignored), if it exists. Save files are only read, never modified.

// cspell:words ISAACNGSAVE wikitext

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ACHIEVEMENT_CATEGORIES } from "./lib/achievementCategories.js";
import { decodePNG } from "./lib/png.js";

const NUM_ACHIEVEMENTS = 641;
const NUM_CHARACTERS = 34;
const NUM_MARKS = 12;
const HARD_MARK_BIT = 0b10;

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const STATIC_DIRECTORY = path.join(REPO_ROOT, "static");

const errors: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) {
    errors.push(message);
  }
}

function readJSON(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(path.join(REPO_ROOT, relativePath), "utf8"),
  ) as unknown;
}

function checkIcon(relativePath: string, size: number) {
  const filePath = path.join(STATIC_DIRECTORY, relativePath);
  if (!existsSync(filePath)) {
    errors.push(`Missing icon: ${relativePath}`);
    return;
  }
  try {
    const image = decodePNG(readFileSync(filePath));
    check(
      image.width === size && image.height === size,
      `Icon ${relativePath} is ${image.width}×${image.height}, expected ${size}×${size}.`,
    );
  } catch (error) {
    errors.push(`Broken icon ${relativePath}: ${String(error)}`);
  }
}

// ---------------------------------------------------------------------------------------------
// achievements.json
// ---------------------------------------------------------------------------------------------

interface Achievement {
  link: string;
  name: string;
  inGameDescription: string;
  unlockDescription: string;
  category: string;
}

const STRING_FIELDS = [
  "link",
  "name",
  "inGameDescription",
  "unlockDescription",
  "category",
] as const;
const ENTITY_REGEX = /&(?:#\d+|#x[\da-f]+|[a-z]+);/i;
const TAG_REGEX = /<\/?[a-z][^>]*>/i;
const WIKITEXT_REGEX = /\[\[|]]|{{|}}|'''|''/;

function validateAchievements() {
  const achievements = readJSON("src/data/achievements.json") as Record<
    string,
    Achievement
  >;
  const validCategories = new Set<string>(ACHIEVEMENT_CATEGORIES);
  const categoryCounts = new Map<string, number>(
    ACHIEVEMENT_CATEGORIES.map((category) => [category, 0]),
  );

  const expectedKeys = new Set(["NEW"]);
  for (let id = 1; id <= NUM_ACHIEVEMENTS; id++) {
    expectedKeys.add(id.toString());
  }

  for (const key of expectedKeys) {
    const achievement = achievements[key];
    if (achievement === undefined) {
      errors.push(`Achievement ${key} is missing.`);
      continue;
    }

    for (const field of STRING_FIELDS) {
      const value = achievement[field] as unknown;
      if (typeof value !== "string") {
        errors.push(`Achievement ${key}: "${field}" is not a string.`);
        continue;
      }
      if (field === "link") {
        continue;
      }
      check(
        !ENTITY_REGEX.test(value),
        `Achievement ${key}: HTML entity in ${field}: ${value}`,
      );
      check(
        !TAG_REGEX.test(value),
        `Achievement ${key}: HTML tag in ${field}: ${value}`,
      );
      check(
        !WIKITEXT_REGEX.test(value),
        `Achievement ${key}: wikitext in ${field}: ${value}`,
      );
      check(value === value.trim(), `Achievement ${key}: untrimmed ${field}.`);
    }
    check(achievement.name !== "", `Achievement ${key} has no name.`);
    check(
      achievement.unlockDescription !== "",
      `Achievement ${key} has no unlock description.`,
    );

    if (validCategories.has(achievement.category)) {
      if (key !== "NEW") {
        categoryCounts.set(
          achievement.category,
          (categoryCounts.get(achievement.category) ?? 0) + 1,
        );
      }
    } else {
      errors.push(
        `Achievement ${key} has an invalid category: ${achievement.category}`,
      );
    }

    if (key !== "NEW") {
      checkIcon(`img/achievements/${key}.png`, 64);
    }
  }

  check(
    achievements["NEW"]?.category === "misc",
    'The "NEW" fallback achievement must have the "misc" category.',
  );
  for (const key of Object.keys(achievements)) {
    check(expectedKeys.has(key), `Unexpected achievement key: ${key}`);
  }

  console.log(
    `achievements.json: ${Object.keys(achievements).length - 1} achievements + "NEW"`,
  );
  for (const [category, count] of categoryCounts) {
    console.log(`  ${category.padEnd(16)} ${count}`);
  }
  const total = [...categoryCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  console.log(`  ${"total".padEnd(16)} ${total}`);
  check(
    total === NUM_ACHIEVEMENTS,
    `Expected ${NUM_ACHIEVEMENTS} categorized achievements.`,
  );
}

// ---------------------------------------------------------------------------------------------
// marks.json
// ---------------------------------------------------------------------------------------------

const MARK_ORDER = [
  "momsHeart",
  "isaac",
  "satan",
  "blueBaby",
  "lamb",
  "bossRush",
  "hush",
  "megaSatan",
  "delirium",
  "mother",
  "beast",
  "ultraGreedier",
] as const;

interface MarksData {
  marks: Array<{ id: string; name: string; icon: string }>;
  characters: Array<{
    id: string;
    name: string;
    tainted: boolean;
    icon: string;
    counters: Record<string, number>;
  }>;
}

function validateMarks(): MarksData {
  const marksData = readJSON("src/data/marks.json") as MarksData;

  check(
    JSON.stringify(marksData.marks.map((mark) => mark.id))
      === JSON.stringify(MARK_ORDER),
    "marks.json: the marks are not in the expected order.",
  );
  for (const mark of marksData.marks) {
    checkIcon(mark.icon, 16);
  }

  check(
    marksData.characters.length === NUM_CHARACTERS,
    `Expected ${NUM_CHARACTERS} characters.`,
  );
  for (const [i, character] of marksData.characters.entries()) {
    check(
      character.tainted === i >= NUM_CHARACTERS / 2,
      `Character ${character.id}: wrong "tainted" value for its position.`,
    );
    check(
      JSON.stringify(Object.keys(character.counters))
        === JSON.stringify(MARK_ORDER),
      `Character ${character.id}: counters do not match the mark ids.`,
    );
    checkIcon(character.icon, 32);
  }

  const indices = marksData.characters.flatMap((character) =>
    Object.values(character.counters),
  );
  const unique = new Set(indices);
  check(
    indices.every((index) => Number.isInteger(index) && index >= 0),
    "Invalid counter index.",
  );
  check(
    indices.length === NUM_CHARACTERS * NUM_MARKS
      && unique.size === indices.length,
    `Expected ${NUM_CHARACTERS * NUM_MARKS} unique counter indices.`,
  );
  console.log(
    `marks.json: ${marksData.characters.length} characters × ${marksData.marks.length} marks = ${indices.length} indices, ${unique.size} unique (range ${Math.min(...indices)}–${Math.max(...indices)})`,
  );

  return marksData;
}

// ---------------------------------------------------------------------------------------------
// Save files
// ---------------------------------------------------------------------------------------------

const SAVE_HEADER = "ISAACNGSAVE09R";
/** 16-byte magic + 4-byte checksum. */
const CHUNKS_OFFSET = 20;
const ACHIEVEMENTS_CHUNK_TYPE = 1;
const COUNTERS_CHUNK_TYPE = 2;

/** Reads the first two chunks (achievements and counters) of a Repentance(+) persistent save. */
function readSave(buffer: Buffer): {
  achievements: Uint8Array;
  counters: Int32Array;
} {
  const header = buffer.toString("latin1", 0, SAVE_HEADER.length);
  if (header !== SAVE_HEADER) {
    throw new Error(
      `Not a Repentance persistent save file (header "${header}").`,
    );
  }

  let offset = CHUNKS_OFFSET;

  const achievementsType = buffer.readInt32LE(offset);
  const achievementsCount = buffer.readInt32LE(offset + 8);
  if (achievementsType !== ACHIEVEMENTS_CHUNK_TYPE) {
    throw new Error("The first chunk is not the achievements chunk.");
  }
  offset += 12;
  const achievements = Uint8Array.from(
    buffer.subarray(offset, offset + achievementsCount),
  );
  offset += achievementsCount;

  const countersType = buffer.readInt32LE(offset);
  const countersCount = buffer.readInt32LE(offset + 8);
  if (countersType !== COUNTERS_CHUNK_TYPE) {
    throw new Error("The second chunk is not the counters chunk.");
  }
  offset += 12;
  const counters = new Int32Array(countersCount);
  for (let i = 0; i < countersCount; i++) {
    counters[i] = buffer.readInt32LE(offset + i * 4);
  }

  return { achievements, counters };
}

function getSavePaths(args: readonly string[]): readonly string[] {
  const inputs = args.length > 0 ? args : [path.join(REPO_ROOT, "saves")];
  return inputs.flatMap((input) => {
    if (!existsSync(input)) {
      return [];
    }
    if (statSync(input).isDirectory()) {
      return readdirSync(input)
        .filter((fileName) => fileName.endsWith(".dat"))
        .toSorted()
        .map((fileName) => path.join(input, fileName));
    }
    return [input];
  });
}

function validateSaves(marksData: MarksData, args: readonly string[]) {
  const savePaths = getSavePaths(args);
  if (savePaths.length === 0) {
    console.log(
      "Saves: none found (pass a save file or directory as an argument).",
    );
    return;
  }

  const total = NUM_CHARACTERS * NUM_MARKS;
  for (const savePath of savePaths) {
    const { achievements, counters } = readSave(readFileSync(savePath));

    let unlockedAchievements = 0;
    for (let id = 1; id <= NUM_ACHIEVEMENTS; id++) {
      if ((achievements[id] ?? 0) !== 0) {
        unlockedAchievements++;
      }
    }

    let hardMarks = 0;
    const missing: string[] = [];
    for (const character of marksData.characters) {
      for (const markID of MARK_ORDER) {
        const index = character.counters[markID] ?? -1;
        const value = counters[index];
        if (value === undefined) {
          errors.push(
            `${path.basename(savePath)}: counter ${index} is out of range.`,
          );
          continue;
        }
        // eslint-disable-next-line no-bitwise
        if ((value & HARD_MARK_BIT) === 0) {
          missing.push(`${character.id}.${markID}`);
        } else {
          hardMarks++;
        }
      }
    }

    console.log(
      `${path.basename(savePath)}: ${counters.length} counters, Hard marks ${hardMarks} / ${total}, achievements ${unlockedAchievements} / ${NUM_ACHIEVEMENTS}${missing.length > 0 ? `, missing marks: ${missing.join(", ")}` : ""}`,
    );
  }
}

// ---------------------------------------------------------------------------------------------

validateAchievements();
const marksData = validateMarks();
validateSaves(marksData, process.argv.slice(2));

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
console.log("\nAll data checks passed.");
