import type { BaziRelation } from './relations';

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

export type HiddenStemRole = 'main' | 'middle' | 'residual';

export type TenGod =
  | '比肩'
  | '劫财'
  | '食神'
  | '伤官'
  | '偏财'
  | '正财'
  | '七杀'
  | '正官'
  | '偏印'
  | '正印';

export interface HiddenStem {
  stem: HeavenlyStem;
  role: HiddenStemRole;
}

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

export interface TenGodOccurrence {
  tenGod: TenGod;
  stem: HeavenlyStem;
  pillar: PillarKey;
  location: 'stem' | 'hidden-stem';
  hiddenRole?: HiddenStemRole;
  ruleIds: string[];
}

export type BaziInputValues = Record<PillarKey, string>;

export type FiveElementDistribution = Record<FiveElement, number>;

export type BaziStrength = '偏弱' | '稍弱' | '中和' | '稍旺' | '偏旺';

export type BaziStrengthV2 = BaziStrength;

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
  evidenceScore?: number;
  reason: string;
  ruleIds?: string[];
}

export type BasicClimate = '平和' | '偏寒' | '偏暖' | '偏燥' | '偏湿' | '寒湿';

export interface BasicTiaohouAnalysis {
  monthCommand: EarthlyBranch;
  climate: BasicClimate;
  favoredElements: FiveElement[];
  adjustment: 0 | 1;
  reason: string;
  ruleIds: string[];
}

export interface StrengthBreakdown {
  supportScore: number;
  weakenScore: number;
  netScore: number;
  monthCommandElement: FiveElement;
  evidence: StrengthEvidence[];
}

export type StrengthEvidenceType =
  | 'month-command'
  | 'root'
  | 'support'
  | 'control'
  | 'output'
  | 'wealth'
  | 'season';

export interface StrengthEvidence {
  type: StrengthEvidenceType;
  element: FiveElement;
  effect: 'support' | 'weaken' | 'neutral';
  level: 1 | 2 | 3 | 4 | 5;
  reason: string;
  ruleIds: string[];
}

export interface BaziStrengthAnalysis {
  strength: BaziStrength;
  strengthRuleIds: string[];
  strengthReason: string;
  strengthBreakdown: StrengthBreakdown;
  tiaohou: BasicTiaohouAnalysis;
  namingTendencies: ElementTendency[];
}

export interface HiddenStemDetail {
  stem: HeavenlyStem;
  role: HiddenStemRole;
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
  strengthRuleIds?: string[];
  strengthReason?: string;
  strengthBreakdown?: StrengthBreakdown;
  tiaohou?: BasicTiaohouAnalysis;
  namingTendencies?: ElementTendency[];
  relations?: BaziRelation[];
  tenGods?: TenGodOccurrence[];
}

export type CompleteBaziAnalysis = Omit<
  BaziAnalysis,
  keyof BaziStrengthAnalysis
> &
  BaziStrengthAnalysis;
