import { HEAVENLY_STEMS } from '../../../data/heavenlyStems';
import type { HeavenlyStem, TenGod } from '../../../types';
import {
  resolveTenGodRelation,
  TEN_GOD_RELATION_RULE_IDS,
  type TenGodRelation,
} from './relation';

export type TenGodPolarity = 'same' | 'opposite';

export interface TenGodResolution {
  tenGod: TenGod;
  relation: TenGodRelation;
  polarity: TenGodPolarity;
  ruleIds: string[];
}

const TEN_GOD_BY_RELATION: Record<
  TenGodRelation,
  Record<TenGodPolarity, TenGod>
> = {
  peer: { same: '比肩', opposite: '劫财' },
  output: { same: '食神', opposite: '伤官' },
  wealth: { same: '偏财', opposite: '正财' },
  officer: { same: '七杀', opposite: '正官' },
  resource: { same: '偏印', opposite: '正印' },
};

const POLARITY_RULE_IDS: Record<TenGodPolarity, string> = {
  same: 'bazi.ten-gods.polarity.same',
  opposite: 'bazi.ten-gods.polarity.opposite',
};

export function resolveTenGod(
  dayMasterStem: HeavenlyStem,
  targetStem: HeavenlyStem,
): TenGodResolution {
  const dayMaster = HEAVENLY_STEMS[dayMasterStem];
  const target = HEAVENLY_STEMS[targetStem];
  const relation = resolveTenGodRelation(dayMaster.element, target.element);
  const polarity: TenGodPolarity =
    dayMaster.yinYang === target.yinYang ? 'same' : 'opposite';

  return {
    tenGod: TEN_GOD_BY_RELATION[relation][polarity],
    relation,
    polarity,
    ruleIds: [TEN_GOD_RELATION_RULE_IDS[relation], POLARITY_RULE_IDS[polarity]],
  };
}
