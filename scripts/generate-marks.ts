// Generates "src/data/marks.json" and downloads the character and completion mark icons.

// Usage: npx tsx scripts/generate-marks.ts

// - Counter indices come from REPENTOGON's EventCounter enum documentation.
// - Icons come from the wiki.gg MediaWiki API.

// cspell:words REPENTOGON

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CHARACTER_DEFINITIONS,
  MARK_DEFINITIONS,
  MARK_ICON_SIZE,
  MARK_SHEET_FILE_NAME,
} from "./lib/marksDefinition.js";
import { cropImage, decodePNG, encodePNG } from "./lib/png.js";
import { download, getImageURLs, politeFetch } from "./lib/wikiApi.js";

/** Pinned to the last commit that changed the file, so that the output is reproducible. */
const EVENT_COUNTER_URL =
  "https://raw.githubusercontent.com/TeamREPENTOGON/REPENTOGON/c076feeed0e8abc4595dcdfc214452cd088d2fab/docs/docs/enums/EventCounter.md";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const STATIC_DIRECTORY = path.join(REPO_ROOT, "static");
const MARKS_JSON_PATH = path.join(REPO_ROOT, "src", "data", "marks.json");
const CHARACTER_ICON_DIRECTORY = "img/characters";
const MARK_ICON_DIRECTORY = "img/marks";
const CHARACTER_ICON_SIZE = 32;

/**
 * Parses the Markdown table rows: `|27 |PROGRESSION_KILL_MOMS_HEART_WITH_ISAAC {: .copyable } | ...
 * |`
 */
function parseEventCounters(markdown: string): ReadonlyMap<string, number> {
  const counters = new Map<string, number>();
  for (const match of markdown.matchAll(/^\|(\d+)\s*\|([\dA-Z_]+)\s/gm)) {
    const [, value, name] = match;
    if (value !== undefined && name !== undefined) {
      counters.set(name, Number.parseInt(value, 10));
    }
  }
  return counters;
}

function assertIconSize(fileName: string, buffer: Buffer, size: number) {
  const image = decodePNG(buffer);
  if (image.width !== size || image.height !== size) {
    throw new Error(
      `Icon "${fileName}" is ${image.width}×${image.height}, expected ${size}×${size}.`,
    );
  }
}

/** The pixels of neighboring cells (with a different outline color) bleed into some cells. */
function removeBleedingPixels(data: Uint8Array) {
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i] ?? 0;
    const blue = data[i + 2] ?? 0;
    if (blue > red) {
      data.fill(0, i, i + 4);
    }
  }
}

async function main() {
  // Counters
  const response = await politeFetch(EVENT_COUNTER_URL);
  const markdown = await response.text();
  const eventCounters = parseEventCounters(markdown);

  const characters = CHARACTER_DEFINITIONS.map((character) => {
    const counters: Record<string, number> = {};
    for (const mark of MARK_DEFINITIONS) {
      const counterName = `PROGRESSION_${mark.counterPrefix}_WITH_${character.counterSuffix}`;
      const index = eventCounters.get(counterName);
      if (index === undefined) {
        throw new Error(`Event counter not found: ${counterName}`);
      }
      counters[mark.id] = index;
    }

    return {
      id: character.id,
      name: character.name,
      tainted: character.tainted,
      icon: `${CHARACTER_ICON_DIRECTORY}/${character.id}.png`,
      counters,
    };
  });

  const allIndices = characters.flatMap((character) =>
    Object.values(character.counters),
  );
  const expectedCount = CHARACTER_DEFINITIONS.length * MARK_DEFINITIONS.length;
  if (
    allIndices.length !== expectedCount
    || new Set(allIndices).size !== expectedCount
  ) {
    throw new Error(`Expected ${expectedCount} unique counter indices.`);
  }

  const marks = MARK_DEFINITIONS.map((mark) => ({
    id: mark.id,
    name: mark.name,
    icon: `${MARK_ICON_DIRECTORY}/${mark.id}.png`,
  }));

  writeFileSync(
    MARKS_JSON_PATH,
    `${JSON.stringify({ marks, characters }, undefined, 2)}\n`,
  );
  console.log(
    `Wrote ${MARKS_JSON_PATH} (${characters.length} characters × ${marks.length} marks).`,
  );

  // Icons
  const fileNames = [
    ...CHARACTER_DEFINITIONS.map((character) => character.wikiIconFileName),
    ...MARK_DEFINITIONS.flatMap((mark) =>
      mark.iconSource.kind === "file" ? [mark.iconSource.fileName] : [],
    ),
    MARK_SHEET_FILE_NAME,
  ];
  const urls = await getImageURLs(fileNames);
  const getURL = (fileName: string) => {
    const url = urls.get(fileName);
    if (url === undefined) {
      throw new Error(`Wiki file not found: ${fileName}`);
    }
    return url;
  };

  mkdirSync(path.join(STATIC_DIRECTORY, CHARACTER_ICON_DIRECTORY), {
    recursive: true,
  });
  mkdirSync(path.join(STATIC_DIRECTORY, MARK_ICON_DIRECTORY), {
    recursive: true,
  });

  for (const character of CHARACTER_DEFINITIONS) {
    // eslint-disable-next-line no-await-in-loop
    const buffer = await download(getURL(character.wikiIconFileName));
    assertIconSize(character.wikiIconFileName, buffer, CHARACTER_ICON_SIZE);
    writeFileSync(
      path.join(
        STATIC_DIRECTORY,
        CHARACTER_ICON_DIRECTORY,
        `${character.id}.png`,
      ),
      buffer,
    );
  }
  console.log(`Downloaded ${CHARACTER_DEFINITIONS.length} character icons.`);

  const sheet = decodePNG(await download(getURL(MARK_SHEET_FILE_NAME)));
  for (const mark of MARK_DEFINITIONS) {
    let buffer: Buffer;
    if (mark.iconSource.kind === "file") {
      // eslint-disable-next-line no-await-in-loop
      buffer = await download(getURL(mark.iconSource.fileName));
    } else {
      const cell = cropImage(
        sheet,
        mark.iconSource.column * MARK_ICON_SIZE,
        mark.iconSource.row * MARK_ICON_SIZE,
        MARK_ICON_SIZE,
        MARK_ICON_SIZE,
      );
      removeBleedingPixels(cell.data);
      buffer = encodePNG(cell);
    }
    assertIconSize(mark.id, buffer, MARK_ICON_SIZE);
    writeFileSync(
      path.join(STATIC_DIRECTORY, MARK_ICON_DIRECTORY, `${mark.id}.png`),
      buffer,
    );
  }
  console.log(`Downloaded ${MARK_DEFINITIONS.length} mark icons.`);
}

await main();
