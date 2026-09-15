import type {
  Bazi,
  BaziRelationKind,
  BaziStrength,
  BasicClimate,
  FiveElementDistribution,
  PillarKey,
  StrengthEvidenceType,
} from '../../types';

type HiddenStemExpectation = {
  stem: string;
  role: 'main' | 'middle' | 'residual';
};

export interface GoldenEvidenceExpectation {
  type: StrengthEvidenceType;
  element: '木' | '火' | '土' | '金' | '水';
  effect: 'support' | 'weaken';
  level: 1 | 2 | 3 | 4 | 5;
  ruleIds: readonly string[];
}

export interface GoldenRelationExpectation {
  id: string;
  kind: BaziRelationKind;
  ruleId: string;
}

export interface BaziGoldenCase {
  id: string;
  title: string;
  purpose: string;
  bazi: Bazi;
  expected: {
    structure: {
      dayMaster: { stem: string; element: '木' | '火' | '土' | '金' | '水'; yinYang: '阴' | '阳' };
      monthCommand: string;
      surfaceElements: FiveElementDistribution;
      hiddenElements: FiveElementDistribution;
      hiddenStems: Record<PillarKey, readonly HiddenStemExpectation[]>;
    };
    relations: readonly GoldenRelationExpectation[];
    strength: {
      value: BaziStrength;
      supportScore: number;
      weakenScore: number;
      netScore: number;
      keyEvidence: readonly GoldenEvidenceExpectation[];
    };
    tiaohou: {
      climate: BasicClimate;
      favoredElements: readonly ('木' | '火' | '土' | '金' | '水')[];
      adjustment: 0 | 1;
    };
    ruleIds: readonly string[];
    referenceIds: readonly string[];
  };
}

const allCoreReferences = [
  'classic-ditian-sui-strength',
  'classic-qiongtong-season',
  'classic-sanming-tonghui',
  'classic-yuanhai-ziping',
  'classic-ziping-month-command',
  'oss-bazi-wuxing-tables',
  'project-v2-strength-model',
] as const;

const allCoreRuleIds = [
  'bazi.hidden-stems.roles',
  'bazi.month-command.priority',
  'bazi.naming-tendency.fuyi',
  'bazi.relations.branches',
  'bazi.relations.stems',
  'bazi.rooting.evidence',
  'bazi.seasonal-strength.phase',
  'bazi.strength.five-levels',
  'bazi.support-control.balance',
  'bazi.tiaohou.basic',
] as const;

/** Deterministic V2 regression fixtures, not final命理 verdicts. */
export const BAZI_GOLDEN_CASES: readonly BaziGoldenCase[] = [
  {
    id: 'metal-in-metal-season',
    title: '申月辛金：时令得势与六合并存',
    purpose: '固定月令、季节、三处金根、显性制约，以及天干生克五合和辰酉六合的组合回归。',
    bazi: {
      year: { stem: '甲', branch: '辰' },
      month: { stem: '壬', branch: '申' },
      day: { stem: '辛', branch: '酉' },
      hour: { stem: '丙', branch: '申' },
    },
    expected: {
      structure: {
        dayMaster: { stem: '辛', element: '金', yinYang: '阴' }, monthCommand: '申',
        surfaceElements: { 木: 1, 火: 1, 土: 1, 金: 4, 水: 1 },
        hiddenElements: { 木: 1, 火: 0, 土: 3, 金: 3, 水: 3 },
        hiddenStems: {
          year: [{ stem: '戊', role: 'main' }, { stem: '乙', role: 'middle' }, { stem: '癸', role: 'residual' }],
          month: [{ stem: '庚', role: 'main' }, { stem: '壬', role: 'middle' }, { stem: '戊', role: 'residual' }],
          day: [{ stem: '辛', role: 'main' }],
          hour: [{ stem: '庚', role: 'main' }, { stem: '壬', role: 'middle' }, { stem: '戊', role: 'residual' }],
        },
      },
      relations: [
        { id: 'stem-generation:month-year', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:day-year', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'stem-generation:year-hour', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-generation:day-month', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:month-hour', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'stem-combination:day-hour', kind: 'stem-combination', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:hour-day', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'branch-combination:year-day', kind: 'branch-combination', ruleId: 'bazi.relations.branches' },
      ],
      strength: {
        value: '偏旺', supportScore: 28, weakenScore: 11, netScore: 17,
        keyEvidence: [
          { type: 'month-command', element: '金', effect: 'support', level: 5, ruleIds: ['bazi.month-command.priority'] },
          { type: 'season', element: '金', effect: 'support', level: 5, ruleIds: ['bazi.seasonal-strength.phase'] },
          { type: 'root', element: '金', effect: 'support', level: 5, ruleIds: ['bazi.hidden-stems.roles', 'bazi.rooting.evidence'] },
          { type: 'control', element: '火', effect: 'weaken', level: 3, ruleIds: ['bazi.support-control.balance'] },
        ],
      },
      tiaohou: { climate: '偏燥', favoredElements: ['水'], adjustment: 1 },
      ruleIds: allCoreRuleIds, referenceIds: allCoreReferences,
    },
  },
  {
    id: 'metal-in-wood-season',
    title: '卯月庚金：时令失势与冲破并存',
    purpose: '固定月令、季节和显性木火制约，保留申根，并验证乙庚合、寅申冲与卯午破均只作结构记录。',
    bazi: {
      year: { stem: '甲', branch: '寅' },
      month: { stem: '乙', branch: '卯' },
      day: { stem: '庚', branch: '申' },
      hour: { stem: '丙', branch: '午' },
    },
    expected: {
      structure: {
        dayMaster: { stem: '庚', element: '金', yinYang: '阳' }, monthCommand: '卯',
        surfaceElements: { 木: 4, 火: 2, 土: 0, 金: 2, 水: 0 },
        hiddenElements: { 木: 2, 火: 2, 土: 3, 金: 1, 水: 1 },
        hiddenStems: {
          year: [{ stem: '甲', role: 'main' }, { stem: '丙', role: 'middle' }, { stem: '戊', role: 'residual' }],
          month: [{ stem: '乙', role: 'main' }],
          day: [{ stem: '庚', role: 'main' }, { stem: '壬', role: 'middle' }, { stem: '戊', role: 'residual' }],
          hour: [{ stem: '丁', role: 'main' }, { stem: '己', role: 'middle' }],
        },
      },
      relations: [
        { id: 'stem-control:day-year', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'stem-generation:year-hour', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-combination:month-day', kind: 'stem-combination', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:day-month', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'stem-generation:month-hour', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:hour-day', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'branch-clash:year-day', kind: 'branch-clash', ruleId: 'bazi.relations.branches' },
        { id: 'branch-break:month-hour', kind: 'branch-break', ruleId: 'bazi.relations.breaks' },
      ],
      strength: {
        value: '偏弱', supportScore: 9, weakenScore: 20, netScore: -11,
        keyEvidence: [
          { type: 'month-command', element: '木', effect: 'weaken', level: 2, ruleIds: ['bazi.month-command.priority'] },
          { type: 'season', element: '金', effect: 'weaken', level: 3, ruleIds: ['bazi.seasonal-strength.phase'] },
          { type: 'root', element: '金', effect: 'support', level: 5, ruleIds: ['bazi.hidden-stems.roles', 'bazi.rooting.evidence'] },
          { type: 'wealth', element: '木', effect: 'weaken', level: 2, ruleIds: ['bazi.support-control.balance'] },
          { type: 'control', element: '火', effect: 'weaken', level: 3, ruleIds: ['bazi.support-control.balance'] },
        ],
      },
      tiaohou: { climate: '平和', favoredElements: [], adjustment: 0 },
      ruleIds: [...allCoreRuleIds, 'bazi.relations.breaks'],
      referenceIds: [...allCoreReferences, 'modern-six-breaks'],
    },
  },
  {
    id: 'wood-support-and-constraint',
    title: '寅月甲木：生扶与克泄耗同时可见',
    purpose: '固定支持和制约均显著时的工程裁决，并覆盖寅申冲、申子辰三合与有向天干生克。',
    bazi: {
      year: { stem: '戊', branch: '辰' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: '甲', branch: '子' },
      hour: { stem: '庚', branch: '申' },
    },
    expected: {
      structure: {
        dayMaster: { stem: '甲', element: '木', yinYang: '阳' }, monthCommand: '寅',
        surfaceElements: { 木: 2, 火: 1, 土: 2, 金: 2, 水: 1 },
        hiddenElements: { 木: 2, 火: 1, 土: 3, 金: 1, 水: 3 },
        hiddenStems: {
          year: [{ stem: '戊', role: 'main' }, { stem: '乙', role: 'middle' }, { stem: '癸', role: 'residual' }],
          month: [{ stem: '甲', role: 'main' }, { stem: '丙', role: 'middle' }, { stem: '戊', role: 'residual' }],
          day: [{ stem: '癸', role: 'main' }],
          hour: [{ stem: '庚', role: 'main' }, { stem: '壬', role: 'middle' }, { stem: '戊', role: 'residual' }],
        },
      },
      relations: [
        { id: 'stem-generation:month-year', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:day-year', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'stem-generation:year-hour', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-generation:day-month', kind: 'stem-generation', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:month-hour', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'stem-control:hour-day', kind: 'stem-control', ruleId: 'bazi.relations.stems' },
        { id: 'branch-clash:month-hour', kind: 'branch-clash', ruleId: 'bazi.relations.branches' },
        { id: 'branch-triple-combination:year-day-hour', kind: 'branch-triple-combination', ruleId: 'bazi.relations.branches' },
      ],
      strength: {
        value: '偏旺', supportScore: 23, weakenScore: 14, netScore: 9,
        keyEvidence: [
          { type: 'month-command', element: '木', effect: 'support', level: 5, ruleIds: ['bazi.month-command.priority'] },
          { type: 'season', element: '木', effect: 'support', level: 5, ruleIds: ['bazi.seasonal-strength.phase'] },
          { type: 'root', element: '木', effect: 'support', level: 5, ruleIds: ['bazi.hidden-stems.roles', 'bazi.rooting.evidence'] },
          { type: 'support', element: '水', effect: 'support', level: 3, ruleIds: ['bazi.hidden-stems.roles', 'bazi.support-control.balance'] },
          { type: 'control', element: '金', effect: 'weaken', level: 3, ruleIds: ['bazi.support-control.balance'] },
        ],
      },
      tiaohou: { climate: '平和', favoredElements: [], adjustment: 0 },
      ruleIds: allCoreRuleIds, referenceIds: allCoreReferences,
    },
  },
];
