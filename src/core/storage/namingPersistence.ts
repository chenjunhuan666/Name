import {
  DATA_VERSION,
  NAMING_MODEL_VERSION,
  RULE_VERSION,
  STORAGE_SCHEMA_VERSION,
} from '../../config/version';
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
  NamingRecordVersions,
  RecentNameViewRecord,
} from '../../types';
import { analyzeBazi } from '../bazi/strengthAnalysis';

export const LEGACY_NAMING_STORAGE_KEY = 'traditional-chinese-naming:v1';
export const NAMING_STORAGE_KEY = 'traditional-chinese-naming:v2';
export const LEGACY_UNVERSIONED = 'legacy-unversioned';
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

export type NamingMigrationCategory =
  | 'storage'
  | 'favorites'
  | 'namingHistory'
  | 'recentViews';

export interface NamingMigrationDiagnostic {
  category: NamingMigrationCategory;
  code:
    | 'invalid-json'
    | 'unsupported-schema'
    | 'invalid-collection'
    | 'invalid-record'
    | 'destination-invalid'
    | 'write-failed'
    | 'readback-failed';
  message: string;
  index?: number;
}

export interface NamingMigrationCounts {
  favorites: { source: number; migrated: number; skipped: number };
  namingHistory: { source: number; migrated: number; skipped: number };
  recentViews: { source: number; migrated: number; skipped: number };
}

export interface NamingMigrationResult {
  status: 'migrated' | 'already-migrated' | 'no-legacy-data' | 'failed';
  data: NamingPersistenceData;
  counts: NamingMigrationCounts;
  diagnostics: NamingMigrationDiagnostic[];
  legacyPreserved: boolean;
}

interface NamingStorageEnvelope extends NamingPersistenceData {
  storageSchemaVersion: number;
  dataVersion: string;
  ruleVersion: string;
  namingModelVersion: string;
  migration?: {
    sourceKey: string;
    migratedAt: string;
    counts: NamingMigrationCounts;
    diagnostics: NamingMigrationDiagnostic[];
  };
}

const EMPTY_NAMING_DATA: NamingPersistenceData = {
  favorites: [],
  namingHistory: [],
  recentViews: [],
};

const CURRENT_RECORD_VERSIONS: NamingRecordVersions = {
  storageSchemaVersion: STORAGE_SCHEMA_VERSION,
  dataVersion: DATA_VERSION,
  ruleVersion: RULE_VERSION,
  namingModelVersion: NAMING_MODEL_VERSION,
};

const LEGACY_RECORD_VERSIONS: NamingRecordVersions = {
  storageSchemaVersion: 1,
  dataVersion: LEGACY_UNVERSIONED,
  ruleVersion: LEGACY_UNVERSIONED,
  namingModelVersion: LEGACY_UNVERSIONED,
};

function emptyCounts(): NamingMigrationCounts {
  return {
    favorites: { source: 0, migrated: 0, skipped: 0 },
    namingHistory: { source: 0, migrated: 0, skipped: 0 },
    recentViews: { source: 0, migrated: 0, skipped: 0 },
  };
}

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
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

function isRecordVersions(value: unknown): value is NamingRecordVersions {
  return (
    isObject(value) &&
    Number.isInteger(value.storageSchemaVersion) &&
    Number(value.storageSchemaVersion) > 0 &&
    isNonEmptyString(value.dataVersion) &&
    isNonEmptyString(value.ruleVersion) &&
    isNonEmptyString(value.namingModelVersion)
  );
}

function reviveFavoriteRecord(
  value: unknown,
  fallbackVersions?: NamingRecordVersions,
): FavoriteNameRecord | undefined {
  if (
    !isObject(value) ||
    typeof value.savedAt !== 'string' ||
    !isGeneratedNameRecord(value.name) ||
    (!fallbackVersions && !isRecordVersions(value))
  ) {
    return undefined;
  }

  return {
    ...(value as unknown as FavoriteNameRecord),
    ...(fallbackVersions ?? {}),
  };
}

function reviveRecentViewRecord(
  value: unknown,
  fallbackVersions?: NamingRecordVersions,
): RecentNameViewRecord | undefined {
  if (
    !isObject(value) ||
    typeof value.viewedAt !== 'string' ||
    !isGeneratedNameRecord(value.name) ||
    (!fallbackVersions && !isRecordVersions(value))
  ) {
    return undefined;
  }

  return {
    ...(value as unknown as RecentNameViewRecord),
    ...(fallbackVersions ?? {}),
  };
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

function reviveHistoryRecord(
  value: unknown,
  fallbackVersions?: NamingRecordVersions,
): NamingHistoryRecord | undefined {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    typeof value.createdAt !== 'string' ||
    (value.inputMode !== 'birth' && value.inputMode !== 'bazi') ||
    typeof value.surname !== 'string' ||
    (value.gender !== 'male' && value.gender !== 'female') ||
    !isBazi(value.bazi) ||
    (!fallbackVersions && !isRecordVersions(value))
  ) {
    return undefined;
  }

  const birthInfo = reviveBirthInfo(value.birthInfo);
  const calendarResult = reviveCalendarResult(value.calendarResult);
  if (
    (value.birthInfo !== undefined && !birthInfo) ||
    (value.calendarResult !== undefined && !calendarResult)
  ) {
    return undefined;
  }

  return {
    ...(value as unknown as NamingHistoryRecord),
    ...(fallbackVersions ?? {}),
    birthInfo,
    calendarResult,
    analysis: analyzeBazi(value.bazi),
  };
}

type RecordCategory = Exclude<NamingMigrationCategory, 'storage'>;

function migrateCollection<T>(
  parsed: Record<string, unknown>,
  category: RecordCategory,
  revive: (value: unknown, versions: NamingRecordVersions) => T | undefined,
  diagnostics: NamingMigrationDiagnostic[],
  counts: NamingMigrationCounts,
): T[] {
  const source = parsed[category];
  if (!Array.isArray(source)) {
    if (source !== undefined) {
      diagnostics.push({
        category,
        code: 'invalid-collection',
        message: `${category} 不是数组，已隔离该集合。`,
      });
    }
    return [];
  }

  counts[category].source = source.length;
  const migrated: T[] = [];
  source.forEach((value, index) => {
    const record = revive(value, LEGACY_RECORD_VERSIONS);
    if (record) {
      migrated.push(record);
      return;
    }
    diagnostics.push({
      category,
      code: 'invalid-record',
      index,
      message: `${category}[${index}] 结构损坏，已隔离且未阻断其他记录。`,
    });
  });
  counts[category].migrated = migrated.length;
  counts[category].skipped = source.length - migrated.length;
  return migrated;
}

function parseLegacyEnvelope(raw: string):
  | {
      data: NamingPersistenceData;
      counts: NamingMigrationCounts;
      diagnostics: NamingMigrationDiagnostic[];
    }
  | { error: NamingMigrationDiagnostic } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      error: {
        category: 'storage',
        code: 'invalid-json',
        message: 'V1 原始值不是有效 JSON，未写入 V2。',
      },
    };
  }

  if (!isObject(parsed) || parsed.version !== 1) {
    return {
      error: {
        category: 'storage',
        code: 'unsupported-schema',
        message: 'V1 原始值的 schema 版本不受支持，未写入 V2。',
      },
    };
  }

  const diagnostics: NamingMigrationDiagnostic[] = [];
  const counts = emptyCounts();
  const favorites = migrateCollection(
    parsed,
    'favorites',
    reviveFavoriteRecord,
    diagnostics,
    counts,
  );
  const namingHistory = migrateCollection(
    parsed,
    'namingHistory',
    reviveHistoryRecord,
    diagnostics,
    counts,
  );
  const recentViews = migrateCollection(
    parsed,
    'recentViews',
    reviveRecentViewRecord,
    diagnostics,
    counts,
  );

  return {
    data: { favorites, namingHistory, recentViews },
    counts,
    diagnostics,
  };
}

function parseCurrentEnvelope(raw: string): NamingStorageEnvelope | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (
    !isObject(parsed) ||
    parsed.storageSchemaVersion !== STORAGE_SCHEMA_VERSION ||
    !isNonEmptyString(parsed.dataVersion) ||
    !isNonEmptyString(parsed.ruleVersion) ||
    !isNonEmptyString(parsed.namingModelVersion) ||
    !Array.isArray(parsed.favorites) ||
    !Array.isArray(parsed.namingHistory) ||
    !Array.isArray(parsed.recentViews)
  ) {
    return undefined;
  }

  const favorites = parsed.favorites.map((value) => reviveFavoriteRecord(value));
  const namingHistory = parsed.namingHistory.map((value) =>
    reviveHistoryRecord(value),
  );
  const recentViews = parsed.recentViews.map((value) =>
    reviveRecentViewRecord(value),
  );
  if (
    favorites.some((value) => !value) ||
    namingHistory.some((value) => !value) ||
    recentViews.some((value) => !value)
  ) {
    return undefined;
  }

  return {
    ...(parsed as unknown as NamingStorageEnvelope),
    favorites: favorites as FavoriteNameRecord[],
    namingHistory: namingHistory as NamingHistoryRecord[],
    recentViews: recentViews as RecentNameViewRecord[],
  };
}

function createEnvelope(
  data: NamingPersistenceData,
  migration?: NamingStorageEnvelope['migration'],
): NamingStorageEnvelope {
  return {
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    dataVersion: DATA_VERSION,
    ruleVersion: RULE_VERSION,
    namingModelVersion: NAMING_MODEL_VERSION,
    ...(migration ? { migration } : {}),
    ...data,
  };
}

function restoreDestination(
  storage: StorageLike,
  previousRaw: string | null,
): void {
  try {
    if (previousRaw === null) {
      storage.removeItem(NAMING_STORAGE_KEY);
    } else {
      storage.setItem(NAMING_STORAGE_KEY, previousRaw);
    }
  } catch {
    // The caller already receives a failed result; the V1 source remains untouched.
  }
}

function commitMigratedEnvelope(
  storage: StorageLike,
  legacyRaw: string,
  previousRaw: string | null,
  migratedAt: string,
): NamingMigrationResult {
  const parsedLegacy = parseLegacyEnvelope(legacyRaw);
  if ('error' in parsedLegacy) {
    return {
      status: 'failed',
      data: { ...EMPTY_NAMING_DATA },
      counts: emptyCounts(),
      diagnostics: [parsedLegacy.error],
      legacyPreserved: storage.getItem(LEGACY_NAMING_STORAGE_KEY) === legacyRaw,
    };
  }

  const envelope = createEnvelope(parsedLegacy.data, {
    sourceKey: LEGACY_NAMING_STORAGE_KEY,
    migratedAt,
    counts: parsedLegacy.counts,
    diagnostics: parsedLegacy.diagnostics,
  });

  try {
    storage.setItem(NAMING_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    return {
      status: 'failed',
      data: { ...EMPTY_NAMING_DATA },
      counts: parsedLegacy.counts,
      diagnostics: [
        ...parsedLegacy.diagnostics,
        {
          category: 'storage',
          code: 'write-failed',
          message: 'V2 写入失败，V1 原始值保持不变。',
        },
      ],
      legacyPreserved: storage.getItem(LEGACY_NAMING_STORAGE_KEY) === legacyRaw,
    };
  }

  const readbackRaw = storage.getItem(NAMING_STORAGE_KEY);
  const readback = readbackRaw ? parseCurrentEnvelope(readbackRaw) : undefined;
  const countsMatch =
    readback?.favorites.length === parsedLegacy.counts.favorites.migrated &&
    readback.namingHistory.length === parsedLegacy.counts.namingHistory.migrated &&
    readback.recentViews.length === parsedLegacy.counts.recentViews.migrated;
  if (!readback || !countsMatch) {
    restoreDestination(storage, previousRaw);
    return {
      status: 'failed',
      data: { ...EMPTY_NAMING_DATA },
      counts: parsedLegacy.counts,
      diagnostics: [
        ...parsedLegacy.diagnostics,
        {
          category: 'storage',
          code: 'readback-failed',
          message: 'V2 回读或数量核对失败，已恢复迁移前的 V2 值。',
        },
      ],
      legacyPreserved: storage.getItem(LEGACY_NAMING_STORAGE_KEY) === legacyRaw,
    };
  }

  return {
    status: 'migrated',
    data: {
      favorites: readback.favorites,
      namingHistory: readback.namingHistory,
      recentViews: readback.recentViews,
    },
    counts: parsedLegacy.counts,
    diagnostics: parsedLegacy.diagnostics,
    legacyPreserved: storage.getItem(LEGACY_NAMING_STORAGE_KEY) === legacyRaw,
  };
}

export function createFavoriteNameRecord(
  name: GeneratedName,
  savedAt = new Date().toISOString(),
): FavoriteNameRecord {
  return { name, savedAt, ...CURRENT_RECORD_VERSIONS };
}

export function createRecentNameViewRecord(
  name: GeneratedName,
  viewedAt = new Date().toISOString(),
): RecentNameViewRecord {
  return { name, viewedAt, ...CURRENT_RECORD_VERSIONS };
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
    ...CURRENT_RECORD_VERSIONS,
  };
}

export function migrateV2ToV3(
  storage?: StorageLike,
  migratedAt = new Date().toISOString(),
): NamingMigrationResult {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) {
    return {
      status: 'failed',
      data: { ...EMPTY_NAMING_DATA },
      counts: emptyCounts(),
      diagnostics: [
        {
          category: 'storage',
          code: 'write-failed',
          message: '浏览器存储不可用，未执行迁移。',
        },
      ],
      legacyPreserved: false,
    };
  }

  try {
    const currentRaw = targetStorage.getItem(NAMING_STORAGE_KEY);
    if (currentRaw) {
      const current = parseCurrentEnvelope(currentRaw);
      if (!current) {
        return {
          status: 'failed',
          data: { ...EMPTY_NAMING_DATA },
          counts: emptyCounts(),
          diagnostics: [
            {
              category: 'storage',
              code: 'destination-invalid',
              message: '现有 V2 值无法校验，自动迁移不会覆盖它。',
            },
          ],
          legacyPreserved: true,
        };
      }
      return {
        status: 'already-migrated',
        data: {
          favorites: current.favorites,
          namingHistory: current.namingHistory,
          recentViews: current.recentViews,
        },
        counts: current.migration?.counts ?? emptyCounts(),
        diagnostics: current.migration?.diagnostics ?? [],
        legacyPreserved: true,
      };
    }

    const legacyRaw = targetStorage.getItem(LEGACY_NAMING_STORAGE_KEY);
    if (!legacyRaw) {
      return {
        status: 'no-legacy-data',
        data: { ...EMPTY_NAMING_DATA },
        counts: emptyCounts(),
        diagnostics: [],
        legacyPreserved: true,
      };
    }

    return commitMigratedEnvelope(
      targetStorage,
      legacyRaw,
      currentRaw,
      migratedAt,
    );
  } catch {
    return {
      status: 'failed',
      data: { ...EMPTY_NAMING_DATA },
      counts: emptyCounts(),
      diagnostics: [
        {
          category: 'storage',
          code: 'write-failed',
          message: '浏览器存储访问失败，未执行迁移。',
        },
      ],
      legacyPreserved: false,
    };
  }
}

export function restoreNamingDataFromV1(
  storage?: StorageLike,
  migratedAt = new Date().toISOString(),
): NamingMigrationResult {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) {
    return migrateV2ToV3(storage, migratedAt);
  }
  try {
    const legacyRaw = targetStorage.getItem(LEGACY_NAMING_STORAGE_KEY);
    if (!legacyRaw) {
      return {
        status: 'no-legacy-data',
        data: { ...EMPTY_NAMING_DATA },
        counts: emptyCounts(),
        diagnostics: [],
        legacyPreserved: true,
      };
    }
    return commitMigratedEnvelope(
      targetStorage,
      legacyRaw,
      targetStorage.getItem(NAMING_STORAGE_KEY),
      migratedAt,
    );
  } catch {
    return {
      status: 'failed',
      data: { ...EMPTY_NAMING_DATA },
      counts: emptyCounts(),
      diagnostics: [
        {
          category: 'storage',
          code: 'write-failed',
          message: '浏览器存储访问失败，未执行恢复。',
        },
      ],
      legacyPreserved: false,
    };
  }
}

export function loadNamingData(storage?: StorageLike): NamingPersistenceData {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) {
    return { ...EMPTY_NAMING_DATA };
  }

  try {
    const currentRaw = targetStorage.getItem(NAMING_STORAGE_KEY);
    if (currentRaw) {
      const current = parseCurrentEnvelope(currentRaw);
      return current
        ? {
            favorites: current.favorites,
            namingHistory: current.namingHistory,
            recentViews: current.recentViews,
          }
        : { ...EMPTY_NAMING_DATA };
    }

    const migration = migrateV2ToV3(targetStorage);
    return migration.status === 'migrated' || migration.status === 'already-migrated'
      ? migration.data
      : { ...EMPTY_NAMING_DATA };
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
    let currentRaw = targetStorage.getItem(NAMING_STORAGE_KEY);
    let current = currentRaw ? parseCurrentEnvelope(currentRaw) : undefined;
    if (currentRaw && !current) {
      return false;
    }

    if (!currentRaw && targetStorage.getItem(LEGACY_NAMING_STORAGE_KEY)) {
      const migration = migrateV2ToV3(targetStorage);
      if (migration.status !== 'migrated' && migration.status !== 'already-migrated') {
        return false;
      }
      currentRaw = targetStorage.getItem(NAMING_STORAGE_KEY);
      current = currentRaw ? parseCurrentEnvelope(currentRaw) : undefined;
    }

    const envelope = createEnvelope(data, current?.migration);
    const serialized = JSON.stringify(envelope);
    targetStorage.setItem(NAMING_STORAGE_KEY, serialized);

    const readbackRaw = targetStorage.getItem(NAMING_STORAGE_KEY);
    const readback = readbackRaw ? parseCurrentEnvelope(readbackRaw) : undefined;
    const valid =
      readback?.favorites.length === data.favorites.length &&
      readback.namingHistory.length === data.namingHistory.length &&
      readback.recentViews.length === data.recentViews.length;
    if (!readback || !valid) {
      restoreDestination(targetStorage, currentRaw);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
