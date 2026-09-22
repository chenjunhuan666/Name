import type { NameScoreDimension } from '../types';

export const NAMING_SCORE_WEIGHTS: Record<NameScoreDimension, number> = {
  element: 0.25,
  meaning: 0.2,
  phonetic: 0.15,
  classic: 0.15,
  homophone: 0.1,
  modern: 0.1,
  shape: 0.025,
  rarity: 0.025,
};

export const NAMING_SCORE_DIMENSIONS: ReadonlyArray<{
  key: NameScoreDimension;
  label: string;
  weight: number;
}> = [
  { key: 'element', label: '五行方向', weight: 25 },
  { key: 'meaning', label: '字义与组合语义', weight: 20 },
  { key: 'phonetic', label: '音律', weight: 15 },
  { key: 'classic', label: '文化出处', weight: 15 },
  { key: 'homophone', label: '谐音安全', weight: 10 },
  { key: 'modern', label: '现代审美', weight: 10 },
  { key: 'shape', label: '字形', weight: 2.5 },
  { key: 'rarity', label: '生僻度', weight: 2.5 },
];

export const ELEMENT_LEVEL_SCORES = [0, 45, 60, 75, 90, 100] as const;
export const CLASSIC_LEVEL_SCORES = { A: 100, B: 80, C: 60 } as const;

export const MODERN_AESTHETIC_SCORE = {
  base: 80,
  naturalBonus: 10,
  completeImageBonus: 5,
  styleConsistencyBonus: 5,
  overlyPopularPenalty: 25,
  overlyWebNovelPenalty: 20,
  coherentRoleBonus: 5,
  repetitiveRolePenalty: 5,
  fragmentRolePenalty: 15,
  conflictingRolePenalty: 20,
  minimum: 30,
  maximum: 100,
} as const;

export const SEMANTIC_PAIR_SCORE = {
  base: 70,
  styleConsistencyBonus: 15,
  completeImageBonus: 10,
  repeatedMeaningPenalty: 20,
  overlyPopularPenalty: 10,
  overlyWebNovelPenalty: 15,
  coherentRoleBonus: 10,
  repetitiveRolePenalty: 8,
  fragmentRolePenalty: 25,
  conflictingRolePenalty: 30,
  unnaturalPenalty: 70,
  minimum: 0,
  filterMinimum: 50,
  minimumMeaningLength: 2,
} as const;

export const SEMANTIC_ROLE_CALIBRATION = {
  roleScale: 1,
} as const;

export const PHONETIC_SCORE = {
  base: 100,
  minimum: 40,
  allSameToneMinimumLength: 3,
  allSameTonePenalty: 24,
  repeatedTonePenalty: 8,
  repeatedInitialPenalty: 6,
  repeatedFinalPenalty: 10,
  repeatedSyllablePenalty: 12,
} as const;

export const CHARACTER_RANK_SCORE = {
  defaultElementLevel: 3,
  elementMultiplier: 100,
  styleMatchBonus: 30,
  genderMatchBonus: 10,
  includedCharacterBonus: 500,
  rarityPenaltyMultiplier: 20,
} as const;

export const GENERATOR_LIMITS = {
  firstCharacterTopK: 240,
  secondCharacterTopK: 240,
  defaultResultLimit: 60,
  retainedBufferFactor: 30,
  compactionTriggerFactor: 2,
  minimumCharacterPool: 2,
} as const;

export const DIVERSITY_LIMITS = {
  firstCharacter: 4,
  secondCharacter: 4,
  elementPair: 6,
  classicSource: 6,
} as const;

export const V3_DIVERSITY_LIMITS = {
  firstCharacterLimit: 6,
  secondCharacterLimit: 6,
  elementPairLimit: 20,
  classicSourceLimit: 10,
} as const;

export const RARITY_LIMITS = {
  common: 0.25,
  balanced: 0.5,
  distinctive: 1,
  default: 0.5,
} as const;

export const MEANING_SCORE = {
  negativeBase: 0,
  positiveBase: 80,
  minimumMeaningLength: 2,
  meaningCompletenessBonus: 10,
  richStyleMinimumCount: 2,
  richStyleBonus: 10,
  basicStyleBonus: 5,
  characterWeight: 0.6,
  semanticWeight: 0.4,
} as const;

export const ELEMENT_SCORE = {
  fallback: 70,
  defaultTendencyLevel: 3,
} as const;

export const RARITY_SCORE = {
  maximum: 100,
  scale: 100,
} as const;

export const SCORE_ROUNDING_FACTOR = 10;

export const SHAPE_SCORE = {
  neutral: 75,
  maximum: 100,
  minimum: 55,
  freeStrokeDifference: 5,
  penaltyPerExtraStroke: 3,
} as const;

export const HOMOPHONE_SCORE = {
  exact: 0,
  approximate: 65,
  safe: 100,
} as const;
