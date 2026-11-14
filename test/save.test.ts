import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ChunkType } from "../src/enums/ChunkType.js";
import { createSaveModel, getProgress } from "../src/save/model.js";
import { parseSaveFile, SaveFileError } from "../src/save/parse.js";

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

/** From the acceptance table in the roadmap. These saves are from the real game. */
const FIXTURES = [
  {
    fileName: "rep+persistentgamedata1.dat",
    achievements: 641,
    items: 720,
    challenges: 45,
    missingItems: [],
  },
  {
    fileName: "rep+persistentgamedata2.dat",
    achievements: 619,
    items: 710,
    challenges: 39,
    missingItems: [9, 18, 484, 514, 538, 690, 694, 696, 704, 724],
  },
  {
    fileName: "rep+persistentgamedata3.dat",
    achievements: 592,
    items: 701,
    challenges: 16,
    missingItems: [
      168, 263, 267, 406, 440, 484, 501, 514, 523, 537, 538, 576, 579, 628, 634,
      690, 693, 703, 721,
    ],
  },
] as const;

const NUM_ACHIEVEMENTS = 641;
const NUM_ITEMS = 720;
const NUM_CHALLENGES = 45;

const HEADER_LENGTH = 16;
const REPENTANCE_PLUS_ACHIEVEMENTS_CHUNK_LENGTH = 642;
const AFTERBIRTH_PLUS_ACHIEVEMENTS_CHUNK_LENGTH = 404;

function readFixture(fileName: string): ArrayBuffer {
  const buffer = readFileSync(path.join(FIXTURES_DIR, fileName));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

/** Makes a buffer that starts with the given header, padded to 16 bytes with spaces. */
function makeHeaderBuffer(header: string): ArrayBuffer {
  return new TextEncoder().encode(header.padEnd(HEADER_LENGTH, " ")).buffer;
}

/** Makes a persistent save file where every chunk is empty. */
function makeEmptySaveFile(achievementsChunkLength: number): ArrayBuffer {
  const numChunks = 11;
  const crcLength = 4;
  const chunkLength = 12; // The type, the length, and a count of 0.
  const view = new DataView(
    new ArrayBuffer(HEADER_LENGTH + crcLength + numChunks * chunkLength),
  );
  new Uint8Array(view.buffer).set(new TextEncoder().encode("ISAACNGSAVE09R  "));

  let offset = HEADER_LENGTH + crcLength;
  for (let chunkType = 1; chunkType <= numChunks; chunkType++) {
    const length =
      chunkType === (ChunkType.ACHIEVEMENTS as number)
        ? achievementsChunkLength
        : 0;
    view.setInt32(offset, chunkType, true);
    view.setInt32(offset + 4, length, true);
    view.setInt32(offset + 8, 0, true);
    offset += chunkLength;
  }

  return view.buffer;
}

describe("fixtures", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.fileName, () => {
      const saveModel = createSaveModel(
        parseSaveFile(readFixture(fixture.fileName)),
      );

      test("achievements", () => {
        expect(getProgress(saveModel.achievements)).toStrictEqual({
          unlocked: fixture.achievements,
          total: NUM_ACHIEVEMENTS,
        });
        expect(saveModel.achievements.map((entry) => entry.id)).toStrictEqual(
          Array.from({ length: NUM_ACHIEVEMENTS }, (_, i) => i + 1),
        );
      });

      test("items touched", () => {
        expect(getProgress(saveModel.items)).toStrictEqual({
          unlocked: fixture.items,
          total: NUM_ITEMS,
        });
        const missingItems = saveModel.items
          .filter((item) => !item.unlocked)
          .map((item) => item.id);
        expect(missingItems).toStrictEqual(fixture.missingItems);
      });

      test("items are valid and sorted by ID", () => {
        const ids = saveModel.items.map((item) => item.id);
        const sorted = ids.every(
          (id, index) => index === 0 || id > (ids[index - 1] ?? id),
        );
        expect(sorted).toBe(true);
        for (const id of ids) {
          expect(id).toBeGreaterThanOrEqual(1);
          expect(id).toBeLessThanOrEqual(999);
        }
      });

      test("challenges", () => {
        expect(saveModel.challenges).toStrictEqual({
          unlocked: fixture.challenges,
          total: NUM_CHALLENGES,
        });
      });
    });
  }
});

describe("header errors", () => {
  test.each([
    "ISAACNG_GSR0018",
    "ISAACNG_GSR0034",
    "ISAACNG_GSR0065",
    "ISAACNG_GSR0142",
  ])("run file %s", (header) => {
    expect(() => parseSaveFile(makeHeaderBuffer(header))).toThrow(
      /temporary game state for a specific run/,
    );
  });

  test.each([
    ["ISAACNGSAVE06R", "Rebirth"],
    ["ISAACNGSAVE08R", "Afterbirth"],
  ])("%s is a %s save", (header, gameType) => {
    expect(() => parseSaveFile(makeHeaderBuffer(header))).toThrow(
      new SaveFileError(
        `That is a save file for The Binding of Isaac: ${gameType}.\nThis site only supports save files for The Binding of Isaac: Repentance+.`,
      ),
    );
  });

  test("Afterbirth+ save", () => {
    expect(() =>
      parseSaveFile(
        makeEmptySaveFile(AFTERBIRTH_PLUS_ACHIEVEMENTS_CHUNK_LENGTH),
      ),
    ).toThrow(/save file for The Binding of Isaac: Afterbirth\+\./);
  });

  test.each([
    ["an unknown header", makeHeaderBuffer("NOT A SAVE FILE")],
    ["an empty file", new ArrayBuffer(0)],
  ])("%s", (_, arrayBuffer) => {
    expect(() => parseSaveFile(arrayBuffer)).toThrow(
      new SaveFileError(
        "That is not a valid save file for The Binding of Isaac: Repentance+.",
      ),
    );
  });

  test("an empty Repentance+ save is accepted", () => {
    expect(() =>
      parseSaveFile(
        makeEmptySaveFile(REPENTANCE_PLUS_ACHIEVEMENTS_CHUNK_LENGTH),
      ),
    ).not.toThrow();
  });
});
