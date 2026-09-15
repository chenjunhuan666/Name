import {
  CONTROLLING_CYCLE,
  GENERATING_CYCLE,
} from '../../../data/fiveElements';
import type {
  ElementRelation,
  FiveElement,
  StrengthEvidence,
} from '../../../types';

export function getElementRelation(
  element: FiveElement,
  dayMasterElement: FiveElement,
): ElementRelation {
  if (element === dayMasterElement) {
    return '同类';
  }
  if (GENERATING_CYCLE[element] === dayMasterElement) {
    return '生扶日主';
  }
  if (GENERATING_CYCLE[dayMasterElement] === element) {
    return '日主所生';
  }
  if (CONTROLLING_CYCLE[element] === dayMasterElement) {
    return '制约日主';
  }
  return '日主所制';
}

export function relationEffect(
  relation: ElementRelation,
): StrengthEvidence['effect'] {
  return relation === '同类' || relation === '生扶日主'
    ? 'support'
    : 'weaken';
}

export function clampEvidenceLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5;
}
