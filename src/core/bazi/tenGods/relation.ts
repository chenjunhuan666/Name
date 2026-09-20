import {
  CONTROLLING_CYCLE,
  GENERATING_CYCLE,
} from '../../../data/fiveElements';
import type { FiveElement } from '../../../types';

export type TenGodRelation =
  | 'peer'
  | 'output'
  | 'wealth'
  | 'officer'
  | 'resource';

export const TEN_GOD_RELATION_RULE_IDS: Record<TenGodRelation, string> = {
  peer: 'bazi.ten-gods.relation.peer',
  output: 'bazi.ten-gods.relation.output',
  wealth: 'bazi.ten-gods.relation.wealth',
  officer: 'bazi.ten-gods.relation.officer',
  resource: 'bazi.ten-gods.relation.resource',
};

export function resolveTenGodRelation(
  dayMasterElement: FiveElement,
  targetElement: FiveElement,
): TenGodRelation {
  if (dayMasterElement === targetElement) {
    return 'peer';
  }
  if (GENERATING_CYCLE[dayMasterElement] === targetElement) {
    return 'output';
  }
  if (CONTROLLING_CYCLE[dayMasterElement] === targetElement) {
    return 'wealth';
  }
  if (CONTROLLING_CYCLE[targetElement] === dayMasterElement) {
    return 'officer';
  }
  if (GENERATING_CYCLE[targetElement] === dayMasterElement) {
    return 'resource';
  }

  throw new Error(
    `无法解析五行关系：日主 ${dayMasterElement}，目标 ${targetElement}`,
  );
}
