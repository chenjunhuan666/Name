import { describe, expect, it } from 'vitest';
import { analyzeBazi } from '../bazi/strengthAnalysis';
import {
  createNamingHistoryRecord,
  loadNamingData,
  NAMING_STORAGE_KEY,
  saveNamingData,
} from './namingPersistence';
import type {
  Bazi,
  CalendarResult,
  FavoriteNameRecord,
  GeneratedName,
  RecentNameViewRecord,
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

describe('Phase 9 本地数据持久化', () => {
  it('保存并恢复收藏、最近浏览和自动排盘会话', () => {
    const storage = createMemoryStorage();
    const favorite: FavoriteNameRecord = {
      name,
      savedAt: '2026-08-20T00:00:00.000Z',
    };
    const recentView: RecentNameViewRecord = {
      name,
      viewedAt: '2026-08-20T00:01:00.000Z',
    };
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
  });

  it('遇到损坏或未知版本数据时返回安全空数据', () => {
    const storage = createMemoryStorage();
    storage.setItem('traditional-chinese-naming:v1', '{broken');

    expect(loadNamingData(storage)).toEqual({
      favorites: [],
      namingHistory: [],
      recentViews: [],
    });

    storage.setItem(
      'traditional-chinese-naming:v1',
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
});
