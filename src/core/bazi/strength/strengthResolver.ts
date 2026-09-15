import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import type { BaziStrength, StrengthEvidence } from '../../../types';

export interface StrengthResolution {
  strength: BaziStrength;
  supportScore: number;
  weakenScore: number;
  netScore: number;
}

export function resolveStrength(
  evidence: readonly StrengthEvidence[],
): StrengthResolution {
  const supportScore = evidence
    .filter(({ effect }) => effect === 'support')
    .reduce((sum, { level }) => sum + level, 0);
  const weakenScore = evidence
    .filter(({ effect }) => effect === 'weaken')
    .reduce((sum, { level }) => sum + level, 0);
  const netScore = supportScore - weakenScore;
  const { thresholds } = BAZI_STRENGTH_CONFIG;

  const strength: BaziStrength =
    netScore >= thresholds.strong
      ? '偏旺'
      : netScore >= thresholds.slightlyStrong
        ? '稍旺'
        : netScore <= thresholds.weak
          ? '偏弱'
          : netScore <= thresholds.slightlyWeak
            ? '稍弱'
            : '中和';

  return { strength, supportScore, weakenScore, netScore };
}
