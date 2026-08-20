import type {
  Bazi,
  BaziAnalysis,
  BirthInfo,
  CalendarResult,
  FavoriteNameRecord,
  GeneratedName,
  Gender,
  InputMode,
  NamingCharacter,
  NamingHistoryRecord,
  RecentNameViewRecord,
} from '../../types';
import { analyzeBazi } from '../bazi/strengthAnalysis';

export const NAMING_STORAGE_KEY = 'traditional-chinese-naming:v1';
export const MAX_NAMING_HISTORY = 10;
export const MAX_RECENT_VIEWS = 12;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface NamingPersistenceData {
  favorites: FavoriteNameRecord[];
  namingHistory: NamingHistoryRecord[];
  recentViews: RecentNameViewRecord[];
}

interface CreateNamingHistoryInput {
  inputMode: InputMode;
  surname: string;
  gender: Gender;
  birthInfo?: BirthInfo;
  calendarResult?: CalendarResult;
  bazi: Bazi;
  analysis: BaziAnalysis;
}

const EMPTY_NAMING_DATA: NamingPersistenceData = {
  favorites: [],
  namingHistory: [],
  recentViews: [],
};

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const heavenlyStems = new Set([
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
]);
const earthlyBranches = new Set([
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
]);
const fiveElements = new Set(['木', '火', '土', '金', '水']);
const scoreDimensions = [
  'element',
  'meaning',
  'phonetic',
  'classic',
  'homophone',
  'shape',
  'rarity',
] as const;

function isPillar(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.stem === 'string' &&
    heavenlyStems.has(value.stem) &&
    typeof value.branch === 'string' &&
    earthlyBranches.has(value.branch)
  );
}

function isBazi(value: unknown): value is Bazi {
  return (
    isObject(value) &&
    isPillar(value.year) &&
    isPillar(value.month) &&
    isPillar(value.day) &&
    isPillar(value.hour)
  );
}

function isNamingCharacter(value: unknown): value is NamingCharacter {
  if (!isObject(value)) {
    return false;
  }

  const elementIsValid =
    (typeof value.element === 'string' && fiveElements.has(value.element)) ||
    (Array.isArray(value.element) &&
      value.element.length > 0 &&
      value.element.every(
        (element) => typeof element === 'string' && fiveElements.has(element),
      ));

  return (
    typeof value.char === 'string' &&
    typeof value.pinyin === 'string' &&
    isFiniteNumber(value.tone) &&
    value.tone >= 1 &&
    value.tone <= 4 &&
    elementIsValid &&
    isFiniteNumber(value.elementConfidence) &&
    isStringArray(value.elementBasis) &&
    typeof value.meaning === 'string' &&
    (value.gender === 'male' ||
      value.gender === 'female' ||
      value.gender === 'neutral') &&
    isFiniteNumber(value.rarity) &&
    isStringArray(value.styleTags)
  );
}

function hasNumericScoreDimensions(value: unknown): boolean {
  return (
    isObject(value) &&
    scoreDimensions.every((dimension) => isFiniteNumber(value[dimension]))
  );
}

function hasStringScoreDimensions(value: unknown): boolean {
  return (
    isObject(value) &&
    scoreDimensions.every(
      (dimension) => typeof value[dimension] === 'string',
    )
  );
}

function isGeneratedNameRecord(value: unknown): value is GeneratedName {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.surname === 'string' &&
    typeof value.givenName === 'string' &&
    typeof value.fullName === 'string' &&
    typeof value.pinyin === 'string' &&
    Array.isArray(value.tones) &&
    value.tones.every(isFiniteNumber) &&
    Array.isArray(value.elements) &&
    value.elements.every(
      (element) => typeof element === 'string' && fiveElements.has(element),
    ) &&
    Array.isArray(value.characters) &&
    value.characters.length === 2 &&
    value.characters.every(isNamingCharacter) &&
    typeof value.meaning === 'string' &&
    isStringArray(value.styleTags) &&
    isFiniteNumber(value.score) &&
    hasNumericScoreDimensions(value.scoreBreakdown) &&
    hasStringScoreDimensions(value.scoreExplanations) &&
    isObject(value.phoneticAssessment) &&
    isFiniteNumber(value.phoneticAssessment.score) &&
    isStringArray(value.phoneticAssessment.initials) &&
    isStringArray(value.phoneticAssessment.finals) &&
    isStringArray(value.phoneticAssessment.notes) &&
    isObject(value.homophoneAssessment) &&
    typeof value.homophoneAssessment.safe === 'boolean' &&
    isFiniteNumber(value.homophoneAssessment.score) &&
    typeof value.homophoneAssessment.normalizedFullName === 'string' &&
    isStringArray(value.homophoneAssessment.matches) &&
    typeof value.recommendation === 'string'
  );
}

function isFavoriteRecord(value: unknown): value is FavoriteNameRecord {
  return (
    isObject(value) &&
    typeof value.savedAt === 'string' &&
    isGeneratedNameRecord(value.name)
  );
}

function isRecentViewRecord(value: unknown): value is RecentNameViewRecord {
  return (
    isObject(value) &&
    typeof value.viewedAt === 'string' &&
    isGeneratedNameRecord(value.name)
  );
}

function isLunarDate(value: unknown): boolean {
  return (
    isObject(value) &&
    Number.isInteger(value.year) &&
    Number.isInteger(value.month) &&
    Number.isInteger(value.day) &&
    typeof value.isLeapMonth === 'boolean'
  );
}

function reviveBirthInfo(value: unknown): BirthInfo | undefined {
  if (
    !isObject(value) ||
    value.calendar !== 'lunar' ||
    !isLunarDate(value.lunarDate) ||
    !Number.isInteger(value.hour) ||
    !Number.isInteger(value.minute) ||
    (value.location !== undefined && typeof value.location !== 'string')
  ) {
    return undefined;
  }

  return value as unknown as BirthInfo;
}

function isSolarTerm(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.occurredAt === 'string'
  );
}

function reviveCalendarResult(value: unknown): CalendarResult | undefined {
  if (
    !isObject(value) ||
    !isLunarDate(value.lunarDate) ||
    typeof value.solarDateText !== 'string' ||
    typeof value.hourBranch !== 'string' ||
    !earthlyBranches.has(value.hourBranch) ||
    typeof value.hourLabel !== 'string' ||
    !isBazi(value.bazi) ||
    !isStringArray(value.calculationNotes) ||
    (value.solarTerm !== undefined && !isSolarTerm(value.solarTerm)) ||
    (value.nextSolarTerm !== undefined && !isSolarTerm(value.nextSolarTerm))
  ) {
    return undefined;
  }

  const solarDate = new Date(String(value.solarDate));
  if (Number.isNaN(solarDate.getTime())) {
    return undefined;
  }

  return {
    ...(value as unknown as CalendarResult),
    solarDate,
  };
}

function reviveHistoryRecord(value: unknown): NamingHistoryRecord | undefined {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    typeof value.createdAt !== 'string' ||
    (value.inputMode !== 'birth' && value.inputMode !== 'bazi') ||
    typeof value.surname !== 'string' ||
    (value.gender !== 'male' && value.gender !== 'female') ||
    !isBazi(value.bazi)
  ) {
    return undefined;
  }

  return {
    ...(value as unknown as NamingHistoryRecord),
    birthInfo: reviveBirthInfo(value.birthInfo),
    calendarResult: reviveCalendarResult(value.calendarResult),
    analysis: analyzeBazi(value.bazi),
  };
}

export function createNamingHistoryRecord(
  input: CreateNamingHistoryInput,
  createdAt = new Date().toISOString(),
): NamingHistoryRecord {
  const pillarKey = Object.values(input.bazi)
    .map(({ stem, branch }) => `${stem}${branch}`)
    .join('-');

  return {
    ...input,
    id: `${createdAt}-${input.surname}-${pillarKey}`,
    createdAt,
  };
}

export function loadNamingData(
  storage?: StorageLike,
): NamingPersistenceData {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) {
    return { ...EMPTY_NAMING_DATA };
  }

  try {
    const raw = targetStorage.getItem(NAMING_STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_NAMING_DATA };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.version !== 1) {
      return { ...EMPTY_NAMING_DATA };
    }

    const favorites = Array.isArray(parsed.favorites)
      ? parsed.favorites.filter(isFavoriteRecord)
      : [];
    const recentViews = Array.isArray(parsed.recentViews)
      ? parsed.recentViews
          .filter(isRecentViewRecord)
          .slice(0, MAX_RECENT_VIEWS)
      : [];
    const namingHistory = Array.isArray(parsed.namingHistory)
      ? parsed.namingHistory
          .map(reviveHistoryRecord)
          .filter((record): record is NamingHistoryRecord => Boolean(record))
          .slice(0, MAX_NAMING_HISTORY)
      : [];

    return { favorites, namingHistory, recentViews };
  } catch {
    return { ...EMPTY_NAMING_DATA };
  }
}

export function saveNamingData(
  data: NamingPersistenceData,
  storage?: StorageLike,
): boolean {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) {
    return false;
  }

  try {
    targetStorage.setItem(
      NAMING_STORAGE_KEY,
      JSON.stringify({ version: 1, ...data }),
    );
    return true;
  } catch {
    return false;
  }
}
