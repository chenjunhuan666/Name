/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BirthInfo } from '../../types';
import { calculateCalendarResult, formatLunarDate } from './calendarEngine';

interface CalendarReferenceCase {
  id: string;
  input: string;
  timezone: 'Asia/Shanghai';
  dayBoundaryConvention: 'midnight';
  eightCharSect: 2;
  expectedLunar: string;
  expectedSolar: string;
  expectedPreviousTerm?: { name: string; occurredAtMinute: string };
  expectedNextTerm?: { name: string; occurredAtMinute: string };
  source: {
    name: string;
    version?: string;
    urlOrBibliography: string;
    accessedAt: string;
  };
  boundaryToleranceSeconds?: number;
}

function parseInput(input: string): BirthInfo {
  const match = /^(\d{4})-(L?)(\d{2})-(\d{2}) (\d{2}):(\d{2})$/u.exec(input);
  if (!match) throw new Error(`无效参考案例输入：${input}`);
  return {
    calendar: 'lunar',
    lunarDate: {
      year: Number(match[1]),
      isLeapMonth: match[2] === 'L',
      month: Number(match[3]),
      day: Number(match[4]),
    },
    hour: Number(match[5]),
    minute: Number(match[6]),
  };
}

const reference = JSON.parse(
  readFileSync(
    new URL('../../../docs/calendar-reference/cases.json', import.meta.url),
    'utf8',
  ),
) as { schemaVersion: 1; cases: CalendarReferenceCase[] };

describe('独立历法参考案例', () => {
  it('覆盖计划要求的年份、闰月、节气和午夜换日边界', () => {
    const ids = reference.cases.map(({ id }) => id);
    for (const token of ['1901', '1950', '2000', '2026', '2050', '2100', 'leap', 'lichun', 'jingzhe', 'qingming', 'lixia', 'midnight']) {
      expect(ids.some((id) => id.includes(token)), token).toBe(true);
    }
  });

  it.each(reference.cases)('$id 与独立来源记录一致', (entry) => {
    const input = parseInput(entry.input);
    const result = calculateCalendarResult(input);

    expect(entry.timezone).toBe('Asia/Shanghai');
    expect(entry.dayBoundaryConvention).toBe('midnight');
    expect(entry.eightCharSect).toBe(2);
    expect(formatLunarDate(input.lunarDate)).toBe(entry.expectedLunar);
    expect(result.solarDateText).toBe(entry.expectedSolar);
    if (entry.expectedPreviousTerm) {
      expect(result.solarTerm).toMatchObject({ name: entry.expectedPreviousTerm.name });
      expect(result.solarTerm?.occurredAt.slice(0, 16)).toBe(entry.expectedPreviousTerm.occurredAtMinute);
    }
    if (entry.expectedNextTerm) {
      expect(result.nextSolarTerm).toMatchObject({ name: entry.expectedNextTerm.name });
      expect(result.nextSolarTerm?.occurredAt.slice(0, 16)).toBe(entry.expectedNextTerm.occurredAtMinute);
    }
    expect(entry.source.urlOrBibliography).toMatch(/^https:\/\/www\.hko\.gov\.hk\//u);
  });
});
