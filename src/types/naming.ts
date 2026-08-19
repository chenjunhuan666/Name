import type { Bazi, BaziAnalysis, FiveElement } from './bazi';

export type Gender = 'male' | 'female';

export type InputMode = 'birth' | 'bazi';

export interface ClassicReference {
  book: string;
  chapter?: string;
  author?: string;
  text: string;
  meaning?: string;
}

export interface NameScoreBreakdown {
  element: number;
  meaning: number;
  phonetic: number;
  classic: number;
  homophone: number;
  shape: number;
  rarity: number;
}

export interface GeneratedName {
  id: string;
  surname: string;
  givenName: string;
  fullName: string;
  pinyin: string;
  tones: number[];
  elements: FiveElement[];
  meaning: string;
  styleTags: string[];
  score: number;
  scoreBreakdown: NameScoreBreakdown;
  recommendation: string;
  classic?: ClassicReference;
}

export interface NamingRequest {
  surname: string;
  gender: Gender;
  bazi: Bazi;
  analysis: BaziAnalysis;
  styleTags?: string[];
}
