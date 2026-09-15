import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import { HEAVENLY_STEMS } from '../../../data/heavenlyStems';
import type {
  Bazi,
  BaziAnalysis,
  PillarKey,
  StrengthEvidence,
} from '../../../types';
import { getElementRelation } from './evidence';
import { hiddenResourceLevel } from './hiddenStemPower';

const VISIBLE_KEYS: PillarKey[] = ['year', 'month', 'hour'];
const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];

export function createSupportEvidence(
  bazi: Bazi,
  analysis: BaziAnalysis,
): StrengthEvidence[] {
  const dayElement = analysis.dayMaster.element;
  const visibleEvidence = VISIBLE_KEYS.flatMap((key) => {
    const stem = bazi[key].stem;
    const element = HEAVENLY_STEMS[stem].element;
    const relation = getElementRelation(element, dayElement);

    return relation === '同类' || relation === '生扶日主'
      ? [
          {
            type: 'support' as const,
            element,
            effect: 'support' as const,
            level: BAZI_STRENGTH_CONFIG.visibleStemLevel[relation],
            reason: `${key === 'year' ? '年' : key === 'month' ? '月' : '时'}干${stem}${element}透出，与${dayElement}日主属于“${relation}”。`,
            ruleIds: ['bazi.support-control.balance'],
          },
        ]
      : [];
  });

  const hiddenResourceEvidence = PILLAR_KEYS.flatMap((key) =>
    analysis.pillars[key].hiddenStems.flatMap(({ stem, role, element }) => {
      const relation = getElementRelation(element, dayElement);
      return relation === '生扶日主'
        ? [
            {
              type: 'support' as const,
              element,
              effect: 'support' as const,
              level: hiddenResourceLevel(role),
              reason: `${bazi[key].branch}支${role === 'main' ? '主气' : role === 'middle' ? '中气' : '余气'}${stem}${element}生扶${dayElement}日主。`,
              ruleIds: [
                'bazi.hidden-stems.roles',
                'bazi.support-control.balance',
              ],
            },
          ]
        : [];
    }),
  );

  return [...visibleEvidence, ...hiddenResourceEvidence];
}
