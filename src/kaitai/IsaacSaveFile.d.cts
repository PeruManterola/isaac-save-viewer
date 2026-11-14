// Types for the generated "IsaacSaveFile.cjs" parser. (It is a CommonJS module that exports the
// `IsaacSaveFile` class.)

import type KaitaiStream from "kaitai-struct/KaitaiStream";
import type { ChunkType } from "../enums/ChunkType.js";

// The CommonJS module exports the class as `module.exports`, which is the default import.
// eslint-disable-next-line import-x/no-default-export
export default class IsaacSaveFile {
  header: SaveHeader;
  chunks: Chunk[];

  constructor(kaitaiStream: KaitaiStream);
}

export interface SaveHeader {
  magic: Uint8Array;
}

export interface Chunk {
  body: Chunks;
  len: number;
  type: ChunkType;
}

export interface AchievementsChunk {
  achievements: number[];
  count: number;
}

export interface CountersChunk {
  counters: number[];
  count: number;
}

export interface LevelCountersChunk {
  counters: number[];
  count: number;
}

export interface CollectiblesChunk {
  /** This is misnamed; collectibles have to actually be touched for this variable to change. */
  seenById: number[];
  count: number;
}

export interface MinibossesChunk {
  seenById: number[];
  count: number;
}

export interface BossesChunk {
  seenById: number[];
  count: number;
}

export interface ChallengeCountersChunk {
  completedById: number[];
  count: number;
}

export interface CutsceneCountersChunk {
  countById: number[];
  count: number;
}

export interface GameSettingsChunk {
  unk: number[];
  count: number;
}

export interface SpecialSeedCountersChunk {
  countById: number[];
  count: number;
}

export interface BestiaryCountersChunk {
  counters: BestiaryCounter[];
  count: number;
}

export interface BestiaryCounter {
  body: BestiaryDeaths;
  count: number;
}

export interface BestiaryDeaths {
  values: EntityValue[];
}

export interface EntityValue {
  entity: number;
  value: number;
}

export type Chunks =
  | AchievementsChunk
  | CountersChunk
  | LevelCountersChunk
  | CollectiblesChunk
  | MinibossesChunk
  | BossesChunk
  | ChallengeCountersChunk
  | CutsceneCountersChunk
  | GameSettingsChunk
  | SpecialSeedCountersChunk
  | BestiaryCountersChunk;
