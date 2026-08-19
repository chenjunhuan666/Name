import type { FiveElement } from './bazi';
import type { ClassicReference, Gender } from './naming';

export type CharacterGender = Gender | 'neutral';

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
