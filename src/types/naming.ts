import type { Bazi, BaziAnalysis, FiveElement } from './bazi';
import type { BirthInfo, CalendarResult } from './calendar';
import type { NamingCharacter } from './character';

export type Gender = 'male' | 'female';

export type InputMode = 'birth' | 'bazi';

export type ClassicSource =
  | 'shijing'
  | 'chuci'
  | 'lunyu'
  | 'mengzi'
  | 'zhouyi'
  | 'zhuangzi'
  | 'tang'
  | 'songci';

export type NamingStyle =
  | '清雅'
  | '大气'
  | '儒雅'
  | '温润'
  | '自然'
  | '书卷'
  | '古典'
  | '简约'
  | '中性';

export interface NamingPreference {
  styles: NamingStyle[];
  excludeStyles?: NamingStyle[];
  includeCharacters?: string[];
  excludeCharacters?: string[];
  rarityPreference: 'common' | 'balanced' | 'distinctive';
  genderExpression: 'masculine' | 'feminine' | 'neutral';
  classicPreference?:
    | 'shijing'
    | 'chuci'
    | 'confucian'
    | 'taoist'
    | 'tang'
    | 'song'
    | 'none';
}

export interface ClassicWork {
  id: string;
  source: ClassicSource;
  book: string;
  title: string;
  author?: string;
  chapter?: string;
  lines: string[];
  display: string;
  imageryNames?: Array<{
    givenName: string;
    explanation: string;
    evidenceText?: string;
  }>;
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
  level?: 'A' | 'B' | 'C';
  matchType?: 'exact-phrase' | 'same-sentence' | 'same-work-imagery';
  explanation?: string;
}

export interface NameScoreBreakdown {
  element: number;
  meaning: number;
  phonetic: number;
  classic: number;
  homophone: number;
  modern?: number;
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
  details?: HomophoneMatch[];
}

export interface HomophoneMatch {
  label: string;
  scope: 'given' | 'full' | 'surname-first';
  category: 'negative' | 'internet';
  matchType: 'exact' | 'approximate';
}

export interface SemanticPairAssessment {
  score: number;
  natural: boolean;
  completeImage: boolean;
  styleConsistency: boolean;
  overlyPopular: boolean;
  overlyWebNovel: boolean;
  nameLike: boolean;
  notes: string[];
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
  scoreExplanations: Partial<Record<NameScoreDimension, string>> &
    Record<Exclude<NameScoreDimension, 'modern'>, string>;
  phoneticAssessment: PhoneticAssessment;
  homophoneAssessment: HomophoneAssessment;
  semanticAssessment?: SemanticPairAssessment;
  recommendation: string;
  classic?: ClassicReference;
}

export interface NamingRecordVersions {
  storageSchemaVersion: number;
  dataVersion: string;
  ruleVersion: string;
  namingModelVersion: string;
}

export interface FavoriteNameRecord extends NamingRecordVersions {
  name: GeneratedName;
  savedAt: string;
}

export interface RecentNameViewRecord extends NamingRecordVersions {
  name: GeneratedName;
  viewedAt: string;
}

export interface NamingHistoryRecord extends NamingRecordVersions {
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
  preference?: NamingPreference;
}
