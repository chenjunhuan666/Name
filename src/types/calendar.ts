import type { Bazi, EarthlyBranch } from './bazi';

export type CalendarType = 'lunar';

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

export interface BirthInfo {
  calendar: CalendarType;
  lunarDate: LunarDate;
  hour: number;
  minute: number;
  location?: string;
}

export interface SolarTerm {
  name: string;
  occurredAt: string;
}

export interface CalendarResult {
  lunarDate: LunarDate;
  solarDate: Date;
  solarDateText: string;
  solarTerm?: SolarTerm;
  nextSolarTerm?: SolarTerm;
  hourBranch: EarthlyBranch;
  hourLabel: string;
  bazi: Bazi;
  calculationNotes: string[];
}

export interface LunarMonthOption {
  month: number;
  isLeapMonth: boolean;
  dayCount: number;
  label: string;
}

export interface TrueSolarTimeOptions {
  enabled: boolean;
  longitude?: number;
}
