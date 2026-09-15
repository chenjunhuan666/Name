import type {
  Bazi,
  BaziAnalysis,
  PillarKey,
  StrengthEvidence,
} from '../../../types';
import { clampEvidenceLevel } from './evidence';
import { hiddenStemPowerLevel } from './hiddenStemPower';

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];
const PILLAR_LABELS: Record<PillarKey, string> = {
  year: '年支',
  month: '月支',
  day: '日支',
  hour: '时支',
};
const ROLE_LABELS = { main: '主气', middle: '中气', residual: '余气' } as const;

export function createRootingEvidence(
  bazi: Bazi,
  analysis: BaziAnalysis,
): StrengthEvidence[] {
  const dayMaster = analysis.dayMaster;

  return PILLAR_KEYS.flatMap((key) =>
    analysis.pillars[key].hiddenStems
      .filter(({ element }) => element === dayMaster.element)
      .map(({ stem, role }) => ({
        type: 'root' as const,
        element: dayMaster.element,
        effect: 'support' as const,
        level: clampEvidenceLevel(
          hiddenStemPowerLevel(role) + (stem === dayMaster.stem ? 1 : 0),
        ),
        reason: `日主${dayMaster.stem}在${PILLAR_LABELS[key]}${bazi[key].branch}的${ROLE_LABELS[role]}${stem}见${dayMaster.element}根，角色层级高低只用于 Name 工程证据。`,
        ruleIds: ['bazi.hidden-stems.roles', 'bazi.rooting.evidence'],
      })),
  );
}
