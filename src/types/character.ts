import type { FiveElement } from './bazi';
import type { ClassicReference, Gender } from './naming';

export type CharacterGender = Gender | 'neutral';

export interface CharacterPronunciation {
  char: string;
  pinyin: string;
  tone: 1 | 2 | 3 | 4;
  strokes?: number;
}

export interface CharacterElementInfo {
  primary: FiveElement;
  alternatives?: FiveElement[];
  basis: string[];
  confidence: number;
}

export interface NamingCharacter {
  char: string;
  pinyin: string;
  tone: 1 | 2 | 3 | 4;
  element: FiveElement | FiveElement[];
  elementConfidence: number;
  elementBasis: string[];
  radical?: string;
  strokes?: number;
  traditionalStrokes?: number;
  meaning: string;
  gender: CharacterGender;
  rarity: number;
  styleTags: string[];
  negative?: boolean;
  classics?: ClassicReference[];
}

export interface NamingCharacterV2 {
  char: string;
  pinyin: string;
  tone: 1 | 2 | 3 | 4;
  radical?: string;
  strokes?: number;
  traditional?: string;
  traditionalStrokes?: number;
  meanings: {
    modern?: string;
    classical?: string;
  };
  elements: {
    primary: FiveElement;
    alternatives?: FiveElement[];
    confidence: number;
    basis: string[];
    references?: string[];
  };
  naming: {
    suitable: boolean;
    usageScore: number;
    rarity: number;
    gender: CharacterGender;
    styleTags: string[];
  };
  sources: {
    standard?: string[];
    dictionary?: string[];
    project?: string[];
  };
}

export interface StandardCharacterEntry {
  char: string;
  index: number;
  level: 1 | 2 | 3;
}

export interface StandardCharacterLibrary {
  schemaVersion: 1;
  source: {
    title: string;
    publisher: string;
    publishedAt: string;
    officialPage: string;
    officialAttachment: string;
    transcription: {
      repository: string;
      commit: string;
      paths: string[];
    };
    independentCheck?: {
      repository: string;
      commit: string;
      path: string;
      result: 'exact-match';
    };
  };
  counts: {
    total: number;
    level1: number;
    level2: number;
    level3: number;
  };
  entries: StandardCharacterEntry[];
}
