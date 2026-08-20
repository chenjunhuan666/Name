import type { Bazi, BaziAnalysis, FiveElement } from './bazi';
import type { BirthInfo, CalendarResult } from './calendar';
import type { NamingCharacter } from './character';

export type Gender = 'male' | 'female';

export type InputMode = 'birth' | 'bazi';

export type ClassicSource = 'shijing' | 'chuci' | 'tang' | 'songci';

export interface ClassicWork {
  id: string;
  source: ClassicSource;
  book: string;
  title: string;
  author?: string;
  chapter?: string;
  lines: string[];
  display: string;
}

export interface ClassicReference {
  workId: string;
  source: ClassicSource;
  book: string;
  title: string;
  chapter?: string;
  author?: string;
  text: string;
  display: string;
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

export type NameScoreDimension = keyof NameScoreBreakdown;

export interface PhoneticAssessment {
  score: number;
  initials: string[];
  finals: string[];
  notes: string[];
}

export interface HomophoneAssessment {
  safe: boolean;
  score: number;
  normalizedFullName: string;
  matches: string[];
}

export interface GeneratedName {
  id: string;
  surname: string;
  givenName: string;
  fullName: string;
  pinyin: string;
  tones: number[];
  elements: FiveElement[];
  characters: [NamingCharacter, NamingCharacter];
  meaning: string;
  styleTags: string[];
  score: number;
  scoreBreakdown: NameScoreBreakdown;
  scoreExplanations: Record<NameScoreDimension, string>;
  phoneticAssessment: PhoneticAssessment;
  homophoneAssessment: HomophoneAssessment;
  recommendation: string;
  classic?: ClassicReference;
}

export interface FavoriteNameRecord {
  name: GeneratedName;
  savedAt: string;
}

export interface RecentNameViewRecord {
  name: GeneratedName;
  viewedAt: string;
}

export interface NamingHistoryRecord {
  id: string;
  createdAt: string;
  inputMode: InputMode;
  surname: string;
  gender: Gender;
  birthInfo?: BirthInfo;
  calendarResult?: CalendarResult;
  bazi: Bazi;
  analysis: BaziAnalysis;
}

export interface NamingRequest {
  surname: string;
  gender: Gender;
  bazi: Bazi;
  analysis: BaziAnalysis;
  styleTags?: string[];
}
