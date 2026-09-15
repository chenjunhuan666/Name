import type {
  BasicClimate,
  BaziStrength,
  EarthlyBranch,
  ElementRelation,
  FiveElement,
  HiddenStemRole,
  StrengthEvidence,
  StrengthEvidenceType,
} from '../types';

export type SeasonalPhase = '旺' | '相' | '休' | '囚' | '死';

/** Name V2 的工程配置，不是古籍固定数值。 */
export const BAZI_STRENGTH_CONFIG = {
  basicTiaohou: {
    寅: { climate: '平和', favoredElements: [] },
    卯: { climate: '平和', favoredElements: [] },
    辰: { climate: '偏湿', favoredElements: ['火'] },
    巳: { climate: '偏暖', favoredElements: ['水'] },
    午: { climate: '偏暖', favoredElements: ['水'] },
    未: { climate: '偏燥', favoredElements: ['水'] },
    申: { climate: '偏燥', favoredElements: ['水'] },
    酉: { climate: '偏燥', favoredElements: ['水'] },
    戌: { climate: '偏燥', favoredElements: ['水'] },
    亥: { climate: '偏寒', favoredElements: ['火'] },
    子: { climate: '偏寒', favoredElements: ['火'] },
    丑: { climate: '寒湿', favoredElements: ['火'] },
  } satisfies Record<
    EarthlyBranch,
    { climate: BasicClimate; favoredElements: readonly FiveElement[] }
  >,
  basicTiaohouAdjustment: 1 as const,
  seasonalPhaseEvidence: {
    旺: { effect: 'support', level: 5 },
    相: { effect: 'support', level: 3 },
    休: { effect: 'weaken', level: 2 },
    囚: { effect: 'weaken', level: 4 },
    死: { effect: 'weaken', level: 3 },
  } satisfies Record<
    SeasonalPhase,
    Pick<StrengthEvidence, 'effect' | 'level'>
  >,
  hiddenStemRoleLevel: {
    main: 4,
    middle: 2,
    residual: 1,
  } satisfies Record<HiddenStemRole, 1 | 2 | 3 | 4 | 5>,
  hiddenResourceLevel: {
    main: 3,
    middle: 2,
    residual: 1,
  } satisfies Record<HiddenStemRole, 1 | 2 | 3 | 4 | 5>,
  monthCommandLevel: {
    '同类': 5,
    '生扶日主': 4,
    '日主所生': 2,
    '制约日主': 4,
    '日主所制': 2,
  } satisfies Record<ElementRelation, 1 | 2 | 3 | 4 | 5>,
  visibleStemLevel: {
    '同类': 3,
    '生扶日主': 3,
    '日主所生': 2,
    '制约日主': 3,
    '日主所制': 2,
  } satisfies Record<ElementRelation, 1 | 2 | 3 | 4 | 5>,
  hiddenConstraintMaximum: {
    control: 2,
    output: 2,
    wealth: 2,
  } satisfies Partial<Record<StrengthEvidenceType, 1 | 2 | 3 | 4 | 5>>,
  hiddenConstraintDefaultMaximum: 1 as const,
  hiddenConstraintRoleLevel: {
    main: 2,
    middle: 1,
    residual: 1,
  } satisfies Record<HiddenStemRole, 1 | 2 | 3 | 4 | 5>,
  namingTendencyBase: {
    偏弱: {
      同类: 4,
      生扶日主: 5,
      日主所生: 2,
      制约日主: 1,
      日主所制: 1,
    },
    稍弱: {
      同类: 4,
      生扶日主: 4,
      日主所生: 2,
      制约日主: 2,
      日主所制: 2,
    },
    中和: {
      同类: 3,
      生扶日主: 3,
      日主所生: 4,
      制约日主: 3,
      日主所制: 3,
    },
    稍旺: {
      同类: 2,
      生扶日主: 2,
      日主所生: 4,
      制约日主: 4,
      日主所制: 3,
    },
    偏旺: {
      同类: 1,
      生扶日主: 1,
      日主所生: 5,
      制约日主: 5,
      日主所制: 4,
    },
  } satisfies Record<
    BaziStrength,
    Record<ElementRelation, 1 | 2 | 3 | 4 | 5>
  >,
  namingTendencyConcentrationMultiplier: 1.5,
  namingTendencyConcentrationAdjustment: 1 as const,
  thresholds: {
    strong: 9,
    slightlyStrong: 3,
    slightlyWeak: -3,
    weak: -9,
  },
} as const;
