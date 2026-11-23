// Parsing of the raw save file. This module does not touch the page.

import { ReadonlySet } from "complete-common";
import KaitaiStream from "kaitai-struct/KaitaiStream";
import { ChunkType } from "../enums/ChunkType.js";
import type { Chunk, Chunks } from "../kaitai/IsaacSaveFile.cjs";
import IsaacSaveFile from "../kaitai/IsaacSaveFile.cjs";

const HEADER_LENGTH = 16;

// Run files are ones that contain data for a run that has been exited mid-way through.
// e.g. gamestate1.dat
const REBIRTH_RUN_HEADER = "ISAACNG_GSR0018";
const AFTERBIRTH_RUN_HEADER = "ISAACNG_GSR0034";
const AFTERBIRTH_PLUS_RUN_HEADER = "ISAACNG_GSR0065";
const REPENTANCE_RUN_HEADER = "ISAACNG_GSR0142";
const RUN_HEADERS = new ReadonlySet([
  REBIRTH_RUN_HEADER,
  AFTERBIRTH_RUN_HEADER,
  AFTERBIRTH_PLUS_RUN_HEADER,
  REPENTANCE_RUN_HEADER,
]);

// Persistent files are ones that contain data for the entire save file.
// e.g. persistentgamedata1.dat
const REBIRTH_PERSISTENT_HEADER = "ISAACNGSAVE06R";
const AFTERBIRTH_PERSISTENT_HEADER = "ISAACNGSAVE08R";
// The November 2026 Repentance+ update bumped the header to 10R (it also added a 12th chunk, which
// we do not read).
const PERSISTENT_HEADERS = new ReadonlySet([
  "ISAACNGSAVE09R",
  "ISAACNGSAVE10R",
]);

// The size of the achievements array is one more than the number of achievements, because there is
// no 0th achievement. Afterbirth+ has 403, Repentance 637, and Repentance+ 641.
const NUM_AFTERBIRTH_PLUS_ACHIEVEMENTS = 404;
const NUM_REPENTANCE_PLUS_ACHIEVEMENTS = 642;

const SUPPORTED_GAME = "The Binding of Isaac: Repentance+";

/** An error caused by the user selecting the wrong kind of file. */
export class SaveFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveFileError";
  }
}

/**
 * Parses a "persistentgamedata" save file.
 *
 * @throws SaveFileError If the file is not a Repentance+ persistent save file.
 */
export function parseSaveFile(arrayBuffer: ArrayBuffer): IsaacSaveFile {
  verifyHeader(arrayBuffer);

  // The format of the save file was reversed by Blade using: https://ide.kaitai.io/
  // It produces a JavaScript decoder that we leverage here.
  const kaitaiStream = new KaitaiStream(arrayBuffer);
  const isaacSaveFile = new IsaacSaveFile(kaitaiStream);

  verifyRepentancePlus(isaacSaveFile);

  return isaacSaveFile;
}

/** Returns the body of a chunk. The caller casts it to the type that matches the chunk type. */
export function getChunkBody(
  isaacSaveFile: IsaacSaveFile,
  chunkType: ChunkType,
): Chunks {
  return getChunk(isaacSaveFile, chunkType).body;
}

function getChunk(isaacSaveFile: IsaacSaveFile, chunkType: ChunkType): Chunk {
  const chunk = isaacSaveFile.chunks[chunkType - 1];
  if (chunk === undefined) {
    throw new Error(`Failed to get the ${ChunkType[chunkType]} chunk.`);
  }

  return chunk;
}

function verifyHeader(arrayBuffer: ArrayBuffer) {
  // Before we invoke the real parser, we manually extract the header (for the purposes of showing a
  // better error message).
  const headerBytes = arrayBuffer.slice(0, HEADER_LENGTH);
  const header = arrayBufferToString(headerBytes);

  if (RUN_HEADERS.has(header)) {
    throw new SaveFileError(
      'That is a file that stores the temporary game state for a specific run.\nYou need to instead select the "persistent" file that contains the data for the entire save file.',
    );
  }

  if (header === REBIRTH_PERSISTENT_HEADER) {
    throw wrongGameTypeError("Rebirth");
  }

  if (header === AFTERBIRTH_PERSISTENT_HEADER) {
    throw wrongGameTypeError("Afterbirth");
  }

  if (!PERSISTENT_HEADERS.has(header)) {
    throw new SaveFileError(
      `That is not a valid save file for ${SUPPORTED_GAME}.`,
    );
  }
}

function arrayBufferToString(arrayBuffer: ArrayBuffer): string {
  const textDecoder = new TextDecoder("utf8");
  const string = textDecoder.decode(arrayBuffer).trim();
  return removeNullCharacters(string).trim();
}

function removeNullCharacters(string: string): string {
  return string.replaceAll("\0", "");
}

function verifyRepentancePlus(isaacSaveFile: IsaacSaveFile) {
  // Afterbirth+, Repentance, and Repentance+ have the same save file header, so we tell them apart
  // by the number of achievements. A later game update may add more, so only fewer is rejected.
  const chunk = getChunk(isaacSaveFile, ChunkType.ACHIEVEMENTS);
  if (chunk.len < NUM_REPENTANCE_PLUS_ACHIEVEMENTS) {
    throw wrongGameTypeError(
      chunk.len === NUM_AFTERBIRTH_PLUS_ACHIEVEMENTS
        ? "Afterbirth+"
        : "Repentance",
    );
  }
}

function wrongGameTypeError(gameType: string): SaveFileError {
  return new SaveFileError(
    `That is a save file for The Binding of Isaac: ${gameType}.\nThis site only supports save files for ${SUPPORTED_GAME}.`,
  );
}
