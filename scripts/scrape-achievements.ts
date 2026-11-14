// Regenerates "src/data/achievements.json" from the wiki.gg Cargo "achievement" table, and
// downloads any achievement icon that is missing or broken.

// Usage: npx tsx scripts/scrape-achievements.ts

// cspell:words Cargo wikitext

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ACHIEVEMENT_CATEGORIES,
  CATEGORY_OVERRIDES,
  getCategory,
  getRuleCategory,
} from "./lib/achievementCategories.js";
import { decodePNG } from "./lib/png.js";
import { cargoQuery, download, getImageURLs } from "./lib/wikiApi.js";
import { pageNameToSlug, wikitextToPlainText } from "./lib/wikitext.js";

const NUM_ACHIEVEMENTS = 641;
const ICON_SIZE = 64;

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const ACHIEVEMENTS_JSON_PATH = path.join(
  REPO_ROOT,
  "src",
  "data",
  "achievements.json",
);
const ACHIEVEMENT_ICON_DIRECTORY = path.join(
  REPO_ROOT,
  "static",
  "img",
  "achievements",
);

/** Shown by the page for achievement IDs that are not in the data file. */
const UNKNOWN_ACHIEVEMENT = {
  link: "Unknown",
  name: "Unknown Achievement",
  inGameDescription: "undefined",
  unlockDescription: "Tracker doesn't know this achievement yet",
  category: "misc",
} as const;

interface Achievement {
  link: string;
  name: string;
  inGameDescription: string;
  unlockDescription: string;
  category: string;
}

function getField(
  row: Readonly<Record<string, string>>,
  field: string,
): string {
  const value = row[field];
  if (value === undefined) {
    throw new Error(
      `Cargo row is missing the "${field}" field: ${JSON.stringify(row)}`,
    );
  }
  return value;
}

function isValidIcon(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const image = decodePNG(readFileSync(filePath));
    return image.width === ICON_SIZE && image.height === ICON_SIZE;
  } catch {
    return false;
  }
}

async function main() {
  const rows = await cargoQuery(
    "achievement",
    ["id", "name", "alias", "link", "description", "requirements", "notes"],
    "id",
  );

  const achievements = new Map<number, Achievement>();
  /** The "achievement_image" table refers to achievements by their unique alias. */
  const aliasToID = new Map<string, number>();
  for (const row of rows) {
    const id = Number.parseInt(getField(row, "id"), 10);
    aliasToID.set(getField(row, "alias"), id);
    const requirements = wikitextToPlainText(getField(row, "requirements"));
    const notes = wikitextToPlainText(getField(row, "notes"), "; ");
    const unlockDescription =
      notes === "" ? requirements : `${requirements} (${notes})`;
    const name = wikitextToPlainText(getField(row, "name"));
    const link = getField(row, "link");

    achievements.set(id, {
      link: link === "" ? "" : pageNameToSlug(link),
      name,
      inGameDescription: wikitextToPlainText(getField(row, "description")),
      unlockDescription,
      category: getCategory({ id, name, unlockDescription }),
    });

    const override = CATEGORY_OVERRIDES.get(id);
    if (
      override !== undefined
      && override.category === getRuleCategory({ id, name, unlockDescription })
    ) {
      throw new Error(
        `The category override for achievement ${id} is no longer needed.`,
      );
    }
  }

  for (let id = 1; id <= NUM_ACHIEVEMENTS; id++) {
    if (!achievements.has(id)) {
      throw new Error(`The wiki has no data for achievement ${id}.`);
    }
  }
  if (achievements.size !== NUM_ACHIEVEMENTS) {
    throw new Error(
      `Expected ${NUM_ACHIEVEMENTS} achievements but the wiki has ${achievements.size}. Update NUM_ACHIEVEMENTS if the game added more.`,
    );
  }

  const output: Record<string, Achievement> = {
    NEW: { ...UNKNOWN_ACHIEVEMENT },
  };
  for (const [id, achievement] of [...achievements].toSorted(
    ([a], [b]) => a - b,
  )) {
    output[id.toString()] = achievement;
  }
  writeFileSync(
    ACHIEVEMENTS_JSON_PATH,
    `${JSON.stringify(output, undefined, 2)}\n`,
  );
  console.log(
    `Wrote ${achievements.size} achievements to ${ACHIEVEMENTS_JSON_PATH}.`,
  );

  for (const category of ACHIEVEMENT_CATEGORIES) {
    const count = [...achievements.values()].filter(
      (achievement) => achievement.category === category,
    ).length;
    console.log(`  ${category}: ${count}`);
  }

  // Only download the icons that are missing or broken; the existing ones are kept as they are.
  const missingIconIDs = [...achievements.keys()].filter(
    (id) => !isValidIcon(path.join(ACHIEVEMENT_ICON_DIRECTORY, `${id}.png`)),
  );
  if (missingIconIDs.length === 0) {
    console.log("All achievement icons are present and valid.");
    return;
  }

  console.log(
    `Downloading ${missingIconIDs.length} missing or broken icons...`,
  );
  const imageRows = await cargoQuery(
    "achievement_image",
    ["achievement", "file"],
    "achievement",
  );
  const idToFileName = new Map<number, string>();
  for (const row of imageRows) {
    const id = aliasToID.get(getField(row, "achievement"));
    const fileName = getField(row, "file").replace(/^File:/, "");
    if (id !== undefined) {
      idToFileName.set(id, fileName);
    }
  }

  const fileNames = missingIconIDs.map((id) => {
    const fileName = idToFileName.get(id);
    if (fileName === undefined) {
      throw new Error(`The wiki has no icon for achievement ${id}.`);
    }
    return fileName;
  });
  const urls = await getImageURLs(fileNames);

  for (const [i, id] of missingIconIDs.entries()) {
    const fileName = fileNames[i] ?? "";
    const url = urls.get(fileName);
    if (url === undefined) {
      throw new Error(`Wiki file not found: ${fileName}`);
    }
    // eslint-disable-next-line no-await-in-loop
    const buffer = await download(url);
    const image = decodePNG(buffer);
    if (image.width !== ICON_SIZE || image.height !== ICON_SIZE) {
      console.warn(
        `Warning: the icon for achievement ${id} is ${image.width}×${image.height}, not ${ICON_SIZE}×${ICON_SIZE}.`,
      );
    }
    writeFileSync(path.join(ACHIEVEMENT_ICON_DIRECTORY, `${id}.png`), buffer);
    console.log(`  ${id}.png <- ${fileName}`);
  }
}

await main();
