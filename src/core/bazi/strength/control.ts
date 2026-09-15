import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import { HEAVENLY_STEMS } from '../../../data/heavenlyStems';
import type {
  Bazi,
  BaziAnalysis,
  ElementRelation,
  PillarKey,
  StrengthEvidence,
} from '../../../types';
import { getElementRelation } from './evidence';

const VISIBLE_KEYS: PillarKey[] = ['year', 'month', 'hour'];
const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];
type ConstraintEvidenceType = 'output' | 'control' | 'wealth';

const TYPE_BY_RELATION: Partial<
  Record<ElementRelation, ConstraintEvidenceType>
> = {
  '日主所生': 'output',
  '制约日主': 'control',
  '日主所制': 'wealth',
};

function constraintType(
  relation: ElementRelation,
): ConstraintEvidenceType | undefined {
  return TYPE_BY_RELATION[relation];
}

export function createConstraintEvidence(
  bazi: Bazi,
  analysis: BaziAnalysis,
): StrengthEvidence[] {
  const dayElement = analysis.dayMaster.element;
  const visibleEvidence = VISIBLE_KEYS.flatMap((key) => {
    const stem = bazi[key].stem;
    const element = HEAVENLY_STEMS[stem].element;
    const relation = getElementRelation(element, dayElement);
    const type = constraintType(relation);

    return type
      ? [
          {
            type,
            element,
            effect: 'weaken' as const,
            level: BAZI_STRENGTH_CONFIG.visibleStemLevel[relation],
            reason: `${key === 'year' ? '年' : key === 'month' ? '月' : '时'}干${stem}${element}透出，与${dayElement}日主属于“${relation}”。`,
            ruleIds: ['bazi.support-control.balance'],
          },
        ]
      : [];
  });

  const hiddenEvidence = PILLAR_KEYS.flatMap((key) =>
    analysis.pillars[key].hiddenStems.flatMap(({ stem, role, element }) => {
      const relation = getElementRelation(element, dayElement);
      const type = constraintType(relation);
      if (!type) {
        return [];
      }

      const maximum =
        BAZI_STRENGTH_CONFIG.hiddenConstraintMaximum[type] ??
        BAZI_STRENGTH_CONFIG.hiddenConstraintDefaultMaximum;
      const roleLevel = BAZI_STRENGTH_CONFIG.hiddenConstraintRoleLevel[role];
      return [
        {
          type,
          element,
          effect: 'weaken' as const,
          level: Math.min(maximum, roleLevel) as 1 | 2 | 3 | 4 | 5,
          reason: `${bazi[key].branch}支${role === 'main' ? '主气' : role === 'middle' ? '中气' : '余气'}${stem}${element}对${dayElement}日主形成“${relation}”证据。`,
          ruleIds: [
            'bazi.hidden-stems.roles',
            'bazi.support-control.balance',
          ],
        },
      ];
    }),
  );

  return [...visibleEvidence, ...hiddenEvidence];
}
