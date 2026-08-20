import { describe, expect, it } from 'vitest';
import type { BirthInfo } from '../../types';
import {
  calculateCalendarResult,
  formatLunarDate,
  getLunarMonthOptions,
} from './calendarEngine';

const planExample: BirthInfo = {
  calendar: 'lunar',
  lunarDate: {
    year: 2026,
    month: 7,
    day: 5,
    isLeapMonth: false,
  },
  hour: 15,
  minute: 28,
  location: '深圳市',
};

describe('农历自动排盘', () => {
  it('把计划示例转换为公历、节气区间、时辰和统一 Bazi', () => {
    const result = calculateCalendarResult(planExample);

    expect(result.solarDateText).toBe('2026-08-17 15:28');
    expect(result.solarDate.toISOString()).toBe('2026-08-17T07:28:00.000Z');
    expect(result.solarTerm).toEqual({
      name: '立秋',
      occurredAt: '2026-08-07 19:42:43',
    });
    expect(result.nextSolarTerm).toEqual({
      name: '白露',
      occurredAt: '2026-09-07 22:41:16',
    });
    expect(result.hourBranch).toBe('申');
    expect(result.hourLabel).toBe('申时（15:00–16:59）');
    expect(result.bazi).toEqual({
      year: { stem: '丙', branch: '午' },
      month: { stem: '丙', branch: '申' },
      day: { stem: '癸', branch: '亥' },
      hour: { stem: '庚', branch: '申' },
    });
  });

  it('识别闰月并拒绝不存在的闰月', () => {
    const options = getLunarMonthOptions(2023);
    expect(options.find((option) => option.isLeapMonth)).toEqual({
      month: 2,
      isLeapMonth: true,
      dayCount: 29,
      label: '闰二月',
    });

    const leapResult = calculateCalendarResult({
      ...planExample,
      lunarDate: {
        year: 2023,
        month: 2,
        day: 1,
        isLeapMonth: true,
      },
      hour: 10,
      minute: 0,
    });
    expect(leapResult.solarDateText).toBe('2023-03-22 10:00');
    expect(leapResult.bazi).toEqual({
      year: { stem: '癸', branch: '卯' },
      month: { stem: '乙', branch: '卯' },
      day: { stem: '己', branch: '卯' },
      hour: { stem: '己', branch: '巳' },
    });

    expect(() =>
      calculateCalendarResult({
        ...planExample,
        lunarDate: {
          year: 2024,
          month: 2,
          day: 1,
          isLeapMonth: true,
        },
      }),
    ).toThrow('2024 年没有闰二月');
  });

  it('校验日期和时间边界', () => {
    expect(() =>
      calculateCalendarResult({
        ...planExample,
        lunarDate: { ...planExample.lunarDate, day: 31 },
      }),
    ).toThrow('农历日期超出当月天数');
    expect(() =>
      calculateCalendarResult({ ...planExample, hour: 24 }),
    ).toThrow('出生小时必须在 0～23 之间');
    expect(() =>
      calculateCalendarResult({ ...planExample, minute: 60 }),
    ).toThrow('出生分钟必须在 0～59 之间');
  });

  it('用明确中文格式展示普通月和闰月', () => {
    expect(formatLunarDate(planExample.lunarDate)).toBe(
      '农历 2026 年七月初五',
    );
    expect(
      formatLunarDate({
        year: 2023,
        month: 2,
        day: 1,
        isLeapMonth: true,
      }),
    ).toBe('农历 2023 年闰二月初一');
  });
});
