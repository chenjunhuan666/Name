import { describe, expect, it } from 'vitest';
import { analyzeBazi } from '../bazi/strengthAnalysis';
import {
  createFavoriteNameRecord,
  createNamingHistoryRecord,
  createRecentNameViewRecord,
  LEGACY_NAMING_STORAGE_KEY,
  LEGACY_UNVERSIONED,
  loadNamingData,
  migrateV2ToV3,
  NAMING_STORAGE_KEY,
  restoreNamingDataFromV1,
  saveNamingData,
} from './namingPersistence';
import type {
  Bazi,
  CalendarResult,
  GeneratedName,
  NamingRecordVersions,
} from '../../types';

const bazi: Bazi = {
  year: { stem: '丙', branch: '午' },
  month: { stem: '丙', branch: '申' },
  day: { stem: '癸', branch: '亥' },
  hour: { stem: '庚', branch: '申' },
};
const analysis = analyzeBazi(bazi);
const name: GeneratedName = {
  id: '9648-9ad8-6797',
  surname: '陈',
  givenName: '高林',
  fullName: '陈高林',
  pinyin: 'chén gāo lín',
  tones: [2, 1, 2],
  elements: ['木', '木'],
  characters: [
    {
      char: '高',
      pinyin: 'gāo',
      tone: 1,
      element: '木',
      elementConfidence: 0.8,
      elementBasis: ['测试数据'],
      meaning: '高远',
      gender: 'neutral',
      rarity: 1,
      styleTags: ['儒雅'],
    },
    {
      char: '林',
      pinyin: 'lín',
      tone: 2,
      element: '木',
      elementConfidence: 0.9,
      elementBasis: ['测试数据'],
      meaning: '生机',
      gender: 'neutral',
      rarity: 1,
      styleTags: ['自然'],
    },
  ],
  meaning: '志向高远，生机蓬勃',
  styleTags: ['儒雅', '自然'],
  score: 100,
  scoreBreakdown: {
    element: 100,
    meaning: 100,
    phonetic: 100,
    classic: 100,
    homophone: 100,
    shape: 100,
    rarity: 100,
  },
  scoreExplanations: {
    element: '测试说明',
    meaning: '测试说明',
    phonetic: '测试说明',
    classic: '测试说明',
    homophone: '测试说明',
    shape: '测试说明',
    rarity: '测试说明',
  },
  phoneticAssessment: {
    score: 100,
    initials: ['g', 'l'],
    finals: ['ao', 'in'],
    notes: ['音律顺畅'],
  },
  homophoneAssessment: {
    safe: true,
    score: 100,
    normalizedFullName: 'chengao lin',
    matches: [],
  },
  recommendation: '测试推荐语',
};
const calendarResult = {
  lunarDate: { year: 2026, month: 7, day: 5, isLeapMonth: false },
  solarDate: new Date('2026-08-17T07:28:00.000Z'),
  solarDateText: '2026-08-17 15:28',
  hourBranch: '申',
  hourLabel: '申时（15:00–16:59）',
  bazi,
  calculationNotes: [],
} satisfies CalendarResult;

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

function withoutVersions<T extends NamingRecordVersions>(record: T) {
  const {
    storageSchemaVersion: _storageSchemaVersion,
    dataVersion: _dataVersion,
    ruleVersion: _ruleVersion,
    namingModelVersion: _namingModelVersion,
    ...legacy
  } = record;
  void _storageSchemaVersion;
  void _dataVersion;
  void _ruleVersion;
  void _namingModelVersion;
  return legacy;
}

describe('Phase 9 本地数据持久化', () => {
  it('保存并恢复收藏、最近浏览和自动排盘会话', () => {
    const storage = createMemoryStorage();
    const favorite = createFavoriteNameRecord(
      name,
      '2026-08-20T00:00:00.000Z',
    );
    const recentView = createRecentNameViewRecord(
      name,
      '2026-08-20T00:01:00.000Z',
    );
    const history = createNamingHistoryRecord(
      {
        inputMode: 'birth',
        surname: '陈',
        gender: 'male',
        birthInfo: {
          calendar: 'lunar',
          lunarDate: calendarResult.lunarDate,
          hour: 15,
          minute: 28,
          location: '深圳市',
        },
        calendarResult,
        bazi,
        analysis,
      },
      '2026-08-20T00:02:00.000Z',
    );

    expect(
      saveNamingData(
        {
          favorites: [favorite],
          namingHistory: [history],
          recentViews: [recentView],
        },
        storage,
      ),
    ).toBe(true);

    const restored = loadNamingData(storage);
    expect(restored.favorites[0]?.name.fullName).toBe('陈高林');
    expect(restored.recentViews[0]?.viewedAt).toBe(
      '2026-08-20T00:01:00.000Z',
    );
    expect(restored.namingHistory[0]?.calendarResult?.solarDate).toBeInstanceOf(
      Date,
    );
    expect(
      restored.namingHistory[0]?.calendarResult?.solarDate.toISOString(),
    ).toBe('2026-08-17T07:28:00.000Z');
    expect(restored.favorites[0]).toMatchObject({
      storageSchemaVersion: 2,
      dataVersion: '3.0.0',
      ruleVersion: '3.0.0',
      namingModelVersion: '3.0.0',
    });
  });

  it('遇到损坏或未知版本数据时返回安全空数据', () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_NAMING_STORAGE_KEY, '{broken');

    expect(loadNamingData(storage)).toEqual({
      favorites: [],
      namingHistory: [],
      recentViews: [],
    });

    storage.setItem(
      LEGACY_NAMING_STORAGE_KEY,
      JSON.stringify({ version: 99, favorites: [{ name }] }),
    );
    expect(loadNamingData(storage).favorites).toEqual([]);
  });

  it('过滤同版本中结构残缺的姓名和四柱记录', () => {
    const storage = createMemoryStorage();
    const incompleteName = { id: 'broken-name', fullName: '残缺姓名' };

    storage.setItem(
      NAMING_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: [
          { name: incompleteName, savedAt: '2026-08-20T00:00:00.000Z' },
        ],
        recentViews: [
          { name: incompleteName, viewedAt: '2026-08-20T00:01:00.000Z' },
        ],
        namingHistory: [
          {
            id: 'broken-history',
            createdAt: '2026-08-20T00:02:00.000Z',
            inputMode: 'bazi',
            surname: '陈',
            gender: 'male',
            bazi: { year: { stem: '甲', branch: '子' } },
            analysis: {},
          },
        ],
      }),
    );

    expect(loadNamingData(storage)).toEqual({
      favorites: [],
      namingHistory: [],
      recentViews: [],
    });
  });

  it('把 V1 三类有效记录迁移到 V2，保留原始值与姓名快照并稳定重复执行', () => {
    const storage = createMemoryStorage();
    const favorite = createFavoriteNameRecord(
      name,
      '2026-08-20T00:00:00.000Z',
    );
    const recentView = createRecentNameViewRecord(
      name,
      '2026-08-20T00:01:00.000Z',
    );
    const history = createNamingHistoryRecord(
      {
        inputMode: 'bazi',
        surname: '陈',
        gender: 'male',
        bazi,
        analysis,
      },
      '2026-08-20T00:02:00.000Z',
    );
    const legacyPayload = JSON.stringify({
      version: 1,
      favorites: [withoutVersions(favorite)],
      namingHistory: [withoutVersions(history)],
      recentViews: [withoutVersions(recentView)],
    });
    storage.setItem(LEGACY_NAMING_STORAGE_KEY, legacyPayload);

    const first = migrateV2ToV3(storage, '2026-09-15T00:00:00.000Z');
    const writtenV2 = storage.getItem(NAMING_STORAGE_KEY);
    const second = migrateV2ToV3(storage, '2026-09-16T00:00:00.000Z');

    expect(first.status).toBe('migrated');
    expect(first.counts).toEqual({
      favorites: { source: 1, migrated: 1, skipped: 0 },
      namingHistory: { source: 1, migrated: 1, skipped: 0 },
      recentViews: { source: 1, migrated: 1, skipped: 0 },
    });
    expect(first.legacyPreserved).toBe(true);
    expect(storage.getItem(LEGACY_NAMING_STORAGE_KEY)).toBe(legacyPayload);
    expect(first.data.favorites[0]?.name).toEqual(name);
    expect(first.data.favorites[0]).toMatchObject({
      storageSchemaVersion: 1,
      dataVersion: LEGACY_UNVERSIONED,
      ruleVersion: LEGACY_UNVERSIONED,
      namingModelVersion: LEGACY_UNVERSIONED,
    });
    expect(second.status).toBe('already-migrated');
    expect(storage.getItem(NAMING_STORAGE_KEY)).toBe(writtenV2);
  });

  it('隔离单条损坏记录并在诊断和数量中明确记录', () => {
    const storage = createMemoryStorage();
    const favorite = withoutVersions(
      createFavoriteNameRecord(name, '2026-08-20T00:00:00.000Z'),
    );
    const history = withoutVersions(
      createNamingHistoryRecord(
        {
          inputMode: 'bazi',
          surname: '陈',
          gender: 'male',
          bazi,
          analysis,
        },
        '2026-08-20T00:02:00.000Z',
      ),
    );
    const recentView = withoutVersions(
      createRecentNameViewRecord(name, '2026-08-20T00:01:00.000Z'),
    );
    storage.setItem(
      LEGACY_NAMING_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: [favorite, { name: { id: 'broken' } }],
        namingHistory: [history, { id: 'broken' }],
        recentViews: [recentView, null],
      }),
    );

    const result = migrateV2ToV3(storage, '2026-09-15T00:00:00.000Z');

    expect(result.status).toBe('migrated');
    expect(result.counts).toEqual({
      favorites: { source: 2, migrated: 1, skipped: 1 },
      namingHistory: { source: 2, migrated: 1, skipped: 1 },
      recentViews: { source: 2, migrated: 1, skipped: 1 },
    });
    expect(result.diagnostics).toHaveLength(3);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'invalid-record',
      'invalid-record',
      'invalid-record',
    ]);
  });

  it('迁移写入失败时不覆盖 V1，也不让空状态写入 V2', () => {
    const base = createMemoryStorage();
    const legacyPayload = JSON.stringify({
      version: 1,
      favorites: [],
      namingHistory: [],
      recentViews: [],
    });
    base.setItem(LEGACY_NAMING_STORAGE_KEY, legacyPayload);
    const storage = {
      ...base,
      setItem(key: string, value: string) {
        if (key === NAMING_STORAGE_KEY) {
          throw new Error(`拒绝写入 ${value.length}`);
        }
        base.setItem(key, value);
      },
    };

    const result = migrateV2ToV3(storage, '2026-09-15T00:00:00.000Z');

    expect(result.status).toBe('failed');
    expect(result.diagnostics.at(-1)?.code).toBe('write-failed');
    expect(storage.getItem(LEGACY_NAMING_STORAGE_KEY)).toBe(legacyPayload);
    expect(storage.getItem(NAMING_STORAGE_KEY)).toBeNull();
    expect(saveNamingData({ favorites: [], namingHistory: [], recentViews: [] }, storage)).toBe(false);
    expect(storage.getItem(NAMING_STORAGE_KEY)).toBeNull();
  });

  it('可从保留的 V1 原始值显式恢复，并在失败时保留原 V2', () => {
    const storage = createMemoryStorage();
    const legacyFavorite = withoutVersions(
      createFavoriteNameRecord(name, '2026-08-20T00:00:00.000Z'),
    );
    storage.setItem(
      LEGACY_NAMING_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: [legacyFavorite],
        namingHistory: [],
        recentViews: [],
      }),
    );
    expect(migrateV2ToV3(storage).status).toBe('migrated');
    expect(saveNamingData({ favorites: [], namingHistory: [], recentViews: [] }, storage)).toBe(true);

    const restored = restoreNamingDataFromV1(
      storage,
      '2026-09-15T00:00:00.000Z',
    );

    expect(restored.status).toBe('migrated');
    expect(restored.data.favorites[0]?.name).toEqual(name);
    expect(loadNamingData(storage).favorites).toHaveLength(1);

    const validV2 = storage.getItem(NAMING_STORAGE_KEY);
    storage.setItem(LEGACY_NAMING_STORAGE_KEY, '{broken');
    expect(restoreNamingDataFromV1(storage).status).toBe('failed');
    expect(storage.getItem(NAMING_STORAGE_KEY)).toBe(validV2);
  });
});
