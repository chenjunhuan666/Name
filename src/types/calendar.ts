import type { Bazi } from './bazi';

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
  solarTerm?: SolarTerm;
  bazi: Bazi;
}

export interface TrueSolarTimeOptions {
  enabled: boolean;
  longitude?: number;
}
