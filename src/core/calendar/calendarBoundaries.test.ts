import { describe, expect, it } from 'vitest';
import type { BirthInfo } from '../../types';
import { calculateCalendarResult, getLunarMonthOptions } from './calendarEngine';

function birth(year: number, month: number, day: number, hour = 12, minute = 0): BirthInfo {
  return { calendar: 'lunar', lunarDate: { year, month, day, isLeapMonth: false }, hour, minute };
}

// Frozen lunar-typescript 1.8.6 baselines, not independent astronomical verification.
// No expected values are computed with the library during test execution.
describe('历法边界回归', () => {
  it.each([
    [1901, '1901-02-19'], [2000, '2000-02-05'],
    [2026, '2026-02-17'], [2100, '2100-02-09'],
  ] as const)('农历 %i 年正月初一与公历及 UTC 对应', (year, date) => {
    const result = calculateCalendarResult(birth(year, 1, 1));
    expect(result.solarDateText).toBe(`${date} 12:00`);
    expect(result.solarDate.toISOString()).toBe(`${date}T04:00:00.000Z`);
    expect(getLunarMonthOptions(year).length).toBeGreaterThanOrEqual(12);
  });

  it.each([1900, 2101, 1901.5, NaN, Infinity])('拒绝范围外或非整数农历年 %s', (year) => {
    expect(() => calculateCalendarResult(birth(year, 1, 1))).toThrow('农历年份必须在 1901～2100 之间');
    expect(() => getLunarMonthOptions(year)).toThrow('农历年份必须在 1901～2100 之间');
  });

  it('上限约束的是农历年，合法腊月允许转换到公历 2101 年', () => {
    expect(calculateCalendarResult(birth(2100, 12, 29)).solarDateText).toBe('2101-01-28 12:00');
  });

  it('春节切换农历年份，不重复切换已经立春的年柱和月柱', () => {
    const before = calculateCalendarResult(birth(2025, 12, 29));
    const after = calculateCalendarResult(birth(2026, 1, 1));
    expect(before.solarDateText).toBe('2026-02-16 12:00');
    expect(after.solarDateText).toBe('2026-02-17 12:00');
    for (const result of [before, after]) {
      expect(result.bazi.year).toEqual({ stem: '丙', branch: '午' });
      expect(result.bazi.month).toEqual({ stem: '庚', branch: '寅' });
    }
  });

  it('立春含秒交接：04:02 尚未交节，04:03 年月柱同时切换', () => {
    const before = calculateCalendarResult(birth(2025, 12, 17, 4, 2));
    const after = calculateCalendarResult(birth(2025, 12, 17, 4, 3));
    const term = { name: '立春', occurredAt: '2026-02-04 04:02:08' };
    expect(before.nextSolarTerm).toEqual(term);
    expect(after.solarTerm).toEqual(term);
    expect(before.bazi.year).toEqual({ stem: '乙', branch: '巳' });
    expect(before.bazi.month).toEqual({ stem: '己', branch: '丑' });
    expect(after.bazi.year).toEqual({ stem: '丙', branch: '午' });
    expect(after.bazi.month).toEqual({ stem: '庚', branch: '寅' });
    expect(before.bazi.day).toEqual(after.bazi.day);
  });

  it('惊蛰整分钟交接：交节时刻归入新月柱，年日柱不变', () => {
    const before = calculateCalendarResult(birth(2026, 1, 17, 21, 58));
    const at = calculateCalendarResult(birth(2026, 1, 17, 21, 59));
    const term = { name: '惊蛰', occurredAt: '2026-03-05 21:59:00' };
    expect(before.nextSolarTerm).toEqual(term);
    expect(at.solarTerm).toEqual(term);
    expect(before.bazi.month).toEqual({ stem: '庚', branch: '寅' });
    expect(at.bazi.month).toEqual({ stem: '辛', branch: '卯' });
    expect(at.bazi.year).toEqual(before.bazi.year);
    expect(at.bazi.day).toEqual(before.bazi.day);
  });

  it('23 时仅进入子时，午夜才换日柱；不把晚子时的时干误当日干', () => {
    const before = calculateCalendarResult(birth(2026, 7, 5, 22, 59));
    const late = calculateCalendarResult(birth(2026, 7, 5, 23, 0));
    const last = calculateCalendarResult(birth(2026, 7, 5, 23, 59));
    const midnight = calculateCalendarResult(birth(2026, 7, 6, 0, 0));
    expect(before.bazi.hour).toEqual({ stem: '癸', branch: '亥' });
    for (const result of [late, last]) {
      expect(result.bazi.day).toEqual({ stem: '癸', branch: '亥' });
      expect(result.bazi.hour).toEqual({ stem: '甲', branch: '子' });
      expect(result.hourLabel).toBe('子时（23:00–00:59）');
    }
    expect(midnight.bazi.day).toEqual({ stem: '甲', branch: '子' });
    expect(midnight.bazi.hour).toEqual(late.bazi.hour);
    expect(midnight.solarDate.getTime() - last.solarDate.getTime()).toBe(60_000);
    expect(midnight.solarDate.toISOString()).toBe('2026-08-17T16:00:00.000Z');
  });

  it('普通二月与闰二月分开，闰月末日越界拒绝', () => {
    const normal = birth(2023, 2, 1);
    const leap = { ...normal, lunarDate: { ...normal.lunarDate, isLeapMonth: true } };
    expect(calculateCalendarResult(normal).solarDateText).toBe('2023-02-20 12:00');
    expect(calculateCalendarResult(leap).solarDateText).toBe('2023-03-22 12:00');
    expect(() => calculateCalendarResult({ ...leap, lunarDate: { ...leap.lunarDate, day: 30 } }))
      .toThrow('农历日期超出当月天数');
  });

  it('出生地点不改变时区或启用真太阳时，结果不修改输入', () => {
    const input = { ...birth(2026, 7, 5, 0, 0), location: '深圳' };
    const original = JSON.stringify(input);
    const result = calculateCalendarResult(input);
    expect(calculateCalendarResult({ ...input, location: '纽约' })).toEqual(result);
    expect(JSON.stringify(input)).toBe(original);
    expect(result.lunarDate).not.toBe(input.lunarDate);
  });
});
