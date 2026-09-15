import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import { FIVE_ELEMENTS, GENERATING_CYCLE } from '../../../data/fiveElements';
import type {
  BaziStrength,
  BasicTiaohouAnalysis,
  ElementRelation,
  ElementTendency,
  FiveElement,
  StrengthEvidence,
} from '../../../types';
import { clampEvidenceLevel, getElementRelation } from './evidence';

function guidance(strength: BaziStrength, relation: ElementRelation): string {
  if (strength === '偏弱' || strength === '稍弱') {
    return relation === '同类' || relation === '生扶日主'
      ? '日主偏向弱时，该关系作为扶助方向'
      : '日主偏向弱时，该关系会增加泄耗或制约';
  }
  if (strength === '偏旺' || strength === '稍旺') {
    return relation === '同类' || relation === '生扶日主'
      ? '日主偏向旺时，该关系不宜继续集中'
      : '日主偏向旺时，该关系可作为疏导或制衡方向';
  }
  return '日主中和时，该关系作为结构平衡参考';
}

export function createNamingTendencies(
  strength: BaziStrength,
  dayMasterElement: FiveElement,
  evidence: readonly StrengthEvidence[],
  tiaohou?: BasicTiaohouAnalysis,
): ElementTendency[] {
  const evidenceScores = Object.fromEntries(
    FIVE_ELEMENTS.map((element) => [
      element,
      evidence
        .filter((item) => item.element === element)
        .reduce((sum, item) => sum + item.level, 0),
    ]),
  ) as Record<FiveElement, number>;
  const average =
    Object.values(evidenceScores).reduce((sum, score) => sum + score, 0) /
    FIVE_ELEMENTS.length;

  return FIVE_ELEMENTS.map((element) => {
    const relation = getElementRelation(element, dayMasterElement);
    const baseLevel = BAZI_STRENGTH_CONFIG.namingTendencyBase[strength][relation];
    const evidenceScore = evidenceScores[element];
    const concentrated =
      average > 0 &&
      evidenceScore >=
        average * BAZI_STRENGTH_CONFIG.namingTendencyConcentrationMultiplier;
    const tiaohouAdjusted = Boolean(tiaohou?.favoredElements.includes(element));
    const level = clampEvidenceLevel(
      baseLevel -
        (concentrated
          ? BAZI_STRENGTH_CONFIG.namingTendencyConcentrationAdjustment
          : 0) +
        (tiaohouAdjusted ? (tiaohou?.adjustment ?? 0) : 0),
    );
    const relatedRuleIds = evidence
      .filter((item) => item.element === element)
      .flatMap((item) => item.ruleIds);

    return {
      element,
      level,
      relation,
      weightedPresence: evidenceScore,
      evidenceScore,
      reason: `${guidance(strength, relation)}；${concentrated ? '该元素的结构证据已相对集中，项目模型下调一档' : '当前证据未触发集中度下调'}；${tiaohouAdjusted ? `${tiaohou?.monthCommand}月${tiaohou?.climate}的基础调候方向使其上调一档` : '基础调候未上调该元素'}。`,
      ruleIds: [
        ...new Set([
          'bazi.naming-tendency.fuyi',
          ...(tiaohouAdjusted ? (tiaohou?.ruleIds ?? []) : []),
          ...relatedRuleIds,
        ]),
      ],
    };
  }).sort(
    (left, right) =>
      right.level - left.level ||
      FIVE_ELEMENTS.indexOf(left.element) - FIVE_ELEMENTS.indexOf(right.element),
  );
}

export function supportingElements(dayMasterElement: FiveElement): FiveElement[] {
  return FIVE_ELEMENTS.filter(
    (element) =>
      element === dayMasterElement ||
      GENERATING_CYCLE[element] === dayMasterElement,
  );
}
