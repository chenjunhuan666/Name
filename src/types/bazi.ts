export type HeavenlyStem =
  | '甲'
  | '乙'
  | '丙'
  | '丁'
  | '戊'
  | '己'
  | '庚'
  | '辛'
  | '壬'
  | '癸';

export type EarthlyBranch =
  | '子'
  | '丑'
  | '寅'
  | '卯'
  | '辰'
  | '巳'
  | '午'
  | '未'
  | '申'
  | '酉'
  | '戌'
  | '亥';

export type FiveElement = '木' | '火' | '土' | '金' | '水';

export type YinYang = '阴' | '阳';

export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}

export interface Bazi {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

export type FiveElementDistribution = Record<FiveElement, number>;

export interface ElementTendency {
  element: FiveElement;
  level: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

export interface BaziAnalysis {
  dayMaster: {
    stem: HeavenlyStem;
    element: FiveElement;
  };
  monthCommand: EarthlyBranch;
  surfaceElements: FiveElementDistribution;
  hiddenElements: FiveElementDistribution;
  strength: '偏弱' | '中和' | '偏旺';
  namingTendencies: ElementTendency[];
}
