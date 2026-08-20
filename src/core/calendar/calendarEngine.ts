import { Lunar, LunarYear } from 'lunar-typescript';
import { parseJiaZi } from '../bazi/ganzhi';
import type {
  Bazi,
  BirthInfo,
  CalendarResult,
  LunarDate,
  LunarMonthOption,
  Pillar,
  SolarTerm,
} from '../../types';

export const MIN_LUNAR_YEAR = 1901;
export const MAX_LUNAR_YEAR = 2100;

const LUNAR_MONTH_NAMES = [
  '正',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '冬',
  '腊',
] as const;
const LUNAR_DAY_NAMES = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
] as const;

const HOUR_LABELS: Record<string, string> = {
  子: '子时（23:00–00:59）',
  丑: '丑时（01:00–02:59）',
  寅: '寅时（03:00–04:59）',
  卯: '卯时（05:00–06:59）',
  辰: '辰时（07:00–08:59）',
  巳: '巳时（09:00–10:59）',
  午: '午时（11:00–12:59）',
  未: '未时（13:00–14:59）',
  申: '申时（15:00–16:59）',
  酉: '酉时（17:00–18:59）',
  戌: '戌时（19:00–20:59）',
  亥: '亥时（21:00–22:59）',
};

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(message);
  }
}

function parseRequiredPillar(value: string, label: string): Pillar {
  const pillar = parseJiaZi(value);

  if (!pillar) {
    throw new Error(`${label}计算结果不是合法六十甲子`);
  }

  return pillar;
}

function toSolarTerm(name: string, occurredAt: string): SolarTerm {
  return { name, occurredAt };
}

function toChinaStandardDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  return new Date(
    Date.UTC(year, month - 1, day, hour - 8, minute, second),
  );
}

export function getLunarMonthOptions(year: number): LunarMonthOption[] {
  assertIntegerInRange(
    year,
    MIN_LUNAR_YEAR,
    MAX_LUNAR_YEAR,
    `农历年份必须在 ${MIN_LUNAR_YEAR}～${MAX_LUNAR_YEAR} 之间`,
  );

  return LunarYear.fromYear(year)
    .getMonthsInYear()
    .map((lunarMonth) => {
      const signedMonth = lunarMonth.getMonth();
      const month = Math.abs(signedMonth);
      const isLeapMonth = signedMonth < 0;

      return {
        month,
        isLeapMonth,
        dayCount: lunarMonth.getDayCount(),
        label: `${isLeapMonth ? '闰' : ''}${LUNAR_MONTH_NAMES[month - 1]}月`,
      };
    });
}

export function formatLunarDate(lunarDate: LunarDate): string {
  const monthName = LUNAR_MONTH_NAMES[lunarDate.month - 1] ?? '';
  const dayName = LUNAR_DAY_NAMES[lunarDate.day - 1] ?? '';

  return `农历 ${lunarDate.year} 年${lunarDate.isLeapMonth ? '闰' : ''}${monthName}月${dayName}`;
}

export function calculateCalendarResult(
  birthInfo: BirthInfo,
): CalendarResult {
  const { lunarDate, hour, minute } = birthInfo;

  assertIntegerInRange(
    lunarDate.year,
    MIN_LUNAR_YEAR,
    MAX_LUNAR_YEAR,
    `农历年份必须在 ${MIN_LUNAR_YEAR}～${MAX_LUNAR_YEAR} 之间`,
  );
  assertIntegerInRange(lunarDate.month, 1, 12, '农历月份必须在 1～12 之间');
  assertIntegerInRange(hour, 0, 23, '出生小时必须在 0～23 之间');
  assertIntegerInRange(minute, 0, 59, '出生分钟必须在 0～59 之间');

  const monthName = LUNAR_MONTH_NAMES[lunarDate.month - 1];
  const lunarYear = LunarYear.fromYear(lunarDate.year);
  if (
    lunarDate.isLeapMonth &&
    lunarYear.getLeapMonth() !== lunarDate.month
  ) {
    throw new Error(`${lunarDate.year} 年没有闰${monthName}月`);
  }

  const signedMonth = lunarDate.isLeapMonth
    ? -lunarDate.month
    : lunarDate.month;
  const lunarMonth = lunarYear.getMonth(signedMonth);
  if (!lunarMonth) {
    throw new Error('农历月份不存在');
  }
  assertIntegerInRange(
    lunarDate.day,
    1,
    lunarMonth.getDayCount(),
    '农历日期超出当月天数',
  );

  const lunar = Lunar.fromYmdHms(
    lunarDate.year,
    signedMonth,
    lunarDate.day,
    hour,
    minute,
    0,
  );
  const solar = lunar.getSolar();
  const eightChar = lunar.getEightChar();
  const bazi: Bazi = {
    year: parseRequiredPillar(eightChar.getYear(), '年柱'),
    month: parseRequiredPillar(eightChar.getMonth(), '月柱'),
    day: parseRequiredPillar(eightChar.getDay(), '日柱'),
    hour: parseRequiredPillar(eightChar.getTime(), '时柱'),
  };
  const previousJie = lunar.getPrevJie();
  const nextJie = lunar.getNextJie();
  const solarDateText = solar.toYmdHms().slice(0, 16);

  return {
    lunarDate: { ...lunarDate },
    solarDate: toChinaStandardDate(
      solar.getYear(),
      solar.getMonth(),
      solar.getDay(),
      solar.getHour(),
      solar.getMinute(),
      solar.getSecond(),
    ),
    solarDateText,
    solarTerm: toSolarTerm(
      previousJie.getName(),
      previousJie.getSolar().toYmdHms(),
    ),
    nextSolarTerm: toSolarTerm(
      nextJie.getName(),
      nextJie.getSolar().toYmdHms(),
    ),
    hourBranch: bazi.hour.branch,
    hourLabel: HOUR_LABELS[bazi.hour.branch],
    bazi,
    calculationNotes: [
      '农历先转换为中国标准时间下的公历日期，再按节气交接计算年柱与月柱。',
      '日柱按公历自然日换日；真太阳时默认关闭，出生地点只作记录。',
      '如处于节气交接、23 时换日或真太阳时争议区间，请在确认页人工核对并可切换到手动四柱修正。',
    ],
  };
}
