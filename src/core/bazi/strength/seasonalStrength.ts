import {
  BAZI_STRENGTH_CONFIG,
  type SeasonalPhase,
} from '../../../config/baziStrength';
import { EARTHLY_BRANCHES } from '../../../data/earthlyBranches';
import {
  CONTROLLING_CYCLE,
  GENERATING_CYCLE,
} from '../../../data/fiveElements';
import type { BaziAnalysis, FiveElement, StrengthEvidence } from '../../../types';
import { getElementRelation, relationEffect } from './evidence';

export function resolveSeasonalPhase(
  element: FiveElement,
  rulingElement: FiveElement,
): SeasonalPhase {
  if (element === rulingElement) {
    return '旺';
  }
  if (GENERATING_CYCLE[rulingElement] === element) {
    return '相';
  }
  if (GENERATING_CYCLE[element] === rulingElement) {
    return '休';
  }
  if (CONTROLLING_CYCLE[rulingElement] === element) {
    return '囚';
  }
  return '死';
}

export function createSeasonalEvidence(
  analysis: BaziAnalysis,
): StrengthEvidence[] {
  const monthElement = EARTHLY_BRANCHES[analysis.monthCommand].element;
  const dayElement = analysis.dayMaster.element;
  const relation = getElementRelation(monthElement, dayElement);
  const phase = resolveSeasonalPhase(dayElement, monthElement);
  const phaseEvidence = BAZI_STRENGTH_CONFIG.seasonalPhaseEvidence[phase];

  return [
    {
      type: 'month-command',
      element: monthElement,
      effect: relationEffect(relation),
      level: BAZI_STRENGTH_CONFIG.monthCommandLevel[relation],
      reason: `月令${analysis.monthCommand}主${monthElement}，与${dayElement}日主属于“${relation}”；月令优先观察，但不单独决定旺衰。`,
      ruleIds: ['bazi.month-command.priority'],
    },
    {
      type: 'season',
      element: dayElement,
      effect: phaseEvidence.effect,
      level: phaseEvidence.level,
      reason: `${analysis.monthCommand}月以${monthElement}为当令五行，${dayElement}在该季节状态记为“${phase}”，作为一条季节证据。`,
      ruleIds: ['bazi.seasonal-strength.phase'],
    },
  ];
}
