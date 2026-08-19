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

export type PillarKey = keyof Bazi;

export type BaziInputValues = Record<PillarKey, string>;

export type FiveElementDistribution = Record<FiveElement, number>;

export type BaziStrength = '偏弱' | '中和' | '偏旺';

export type ElementRelation =
  | '同类'
  | '生扶日主'
  | '日主所生'
  | '制约日主'
  | '日主所制';

export interface ElementTendency {
  element: FiveElement;
  level: 1 | 2 | 3 | 4 | 5;
  relation: ElementRelation;
  weightedPresence: number;
  reason: string;
}

export interface StrengthBreakdown {
  weightedElements: FiveElementDistribution;
  supportWeight: number;
  regulatingWeight: number;
  totalWeight: number;
  supportRatio: number;
  monthCommandElement: FiveElement;
}

export interface BaziStrengthAnalysis {
  strength: BaziStrength;
  strengthReason: string;
  strengthBreakdown: StrengthBreakdown;
  namingTendencies: ElementTendency[];
}

export interface HiddenStemDetail {
  stem: HeavenlyStem;
  element: FiveElement;
  yinYang: YinYang;
}

export interface PillarAnalysis {
  stemElement: FiveElement;
  stemYinYang: YinYang;
  branchElement: FiveElement;
  branchYinYang: YinYang;
  hiddenStems: HiddenStemDetail[];
}

export interface BaziAnalysis {
  dayMaster: {
    stem: HeavenlyStem;
    element: FiveElement;
    yinYang: YinYang;
  };
  monthCommand: EarthlyBranch;
  surfaceElements: FiveElementDistribution;
  hiddenElements: FiveElementDistribution;
  pillars: Record<PillarKey, PillarAnalysis>;
  strength?: BaziStrength;
  strengthReason?: string;
  strengthBreakdown?: StrengthBreakdown;
  namingTendencies?: ElementTendency[];
}

export type CompleteBaziAnalysis = Omit<
  BaziAnalysis,
  keyof BaziStrengthAnalysis
> &
  BaziStrengthAnalysis;
