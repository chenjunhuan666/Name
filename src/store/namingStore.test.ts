import { describe, expect, it } from 'vitest';
import { analyzeBazi } from '../core/bazi/strengthAnalysis';
import {
  MAX_NAMING_HISTORY,
  MAX_RECENT_VIEWS,
  createNamingHistoryRecord,
} from '../core/storage/namingPersistence';
import type { Bazi, GeneratedName } from '../types';
import { initialNamingState, namingReducer } from './namingStore';

const bazi: Bazi = {
  year: { stem: '丙', branch: '午' },
  month: { stem: '丙', branch: '申' },
  day: { stem: '癸', branch: '亥' },
  hour: { stem: '庚', branch: '申' },
};
const analysis = analyzeBazi(bazi);
const name = {
  id: 'name-1',
  fullName: '陈高林',
  givenName: '高林',
  surname: '陈',
  pinyin: 'chén gāo lín',
  score: 100,
} as GeneratedName;

describe('Phase 9 命名状态', () => {
  it('按姓名标识切换收藏，并保存完整姓名快照', () => {
    const saved = namingReducer(initialNamingState, {
      type: 'TOGGLE_FAVORITE',
      payload: { name, savedAt: '2026-08-20T00:00:00.000Z' },
    });

    expect(saved.favorites).toEqual([
      { name, savedAt: '2026-08-20T00:00:00.000Z' },
    ]);
    expect(
      namingReducer(saved, {
        type: 'TOGGLE_FAVORITE',
        payload: { name, savedAt: '2026-08-20T00:01:00.000Z' },
      }).favorites,
    ).toEqual([]);
  });

  it('最近浏览去重置顶并限制为固定条数', () => {
    const names = Array.from({ length: MAX_RECENT_VIEWS + 2 }, (_, index) => ({
      ...name,
      id: `name-${index}`,
      fullName: `陈姓名${index}`,
    }));
    const state = names.reduce(
      (current, currentName, index) =>
        namingReducer(current, {
          type: 'RECORD_NAME_VIEW',
          payload: {
            name: currentName,
            viewedAt: `2026-08-20T00:${String(index).padStart(2, '0')}:00.000Z`,
          },
        }),
      initialNamingState,
    );

    expect(state.recentViews).toHaveLength(MAX_RECENT_VIEWS);
    expect(state.recentViews[0]?.name.id).toBe(
      `name-${MAX_RECENT_VIEWS + 1}`,
    );

    const revisited = namingReducer(state, {
      type: 'RECORD_NAME_VIEW',
      payload: {
        name: names[3]!,
        viewedAt: '2026-08-20T01:00:00.000Z',
      },
    });
    expect(revisited.recentViews[0]?.name.id).toBe('name-3');
    expect(
      revisited.recentViews.filter(({ name: item }) => item.id === 'name-3'),
    ).toHaveLength(1);
  });

  it('限制起名历史数量，并可恢复历史会话而不清除收藏', () => {
    const records = Array.from(
      { length: MAX_NAMING_HISTORY + 2 },
      (_, index) =>
        createNamingHistoryRecord(
          {
            inputMode: 'bazi',
            surname: index === 0 ? '陈' : '林',
            gender: 'male',
            bazi,
            analysis,
          },
          `2026-08-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        ),
    );
    const withHistory = records.reduce(
      (current, record) =>
        namingReducer(current, {
          type: 'ADD_NAMING_HISTORY',
          payload: record,
        }),
      {
        ...initialNamingState,
        favorites: [
          { name, savedAt: '2026-08-20T00:00:00.000Z' },
        ],
      },
    );

    expect(withHistory.namingHistory).toHaveLength(MAX_NAMING_HISTORY);

    const restored = namingReducer(withHistory, {
      type: 'RESTORE_NAMING_HISTORY',
      payload: records[0]!,
    });
    expect(restored.surname).toBe('陈');
    expect(restored.bazi).toEqual(bazi);
    expect(restored.generatedNames).toEqual([]);
    expect(restored.favorites).toHaveLength(1);
  });
});
