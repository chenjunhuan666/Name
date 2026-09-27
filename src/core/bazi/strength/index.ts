import type {
  Bazi,
  BaziAnalysis,
  BaziStrengthAnalysis,
  CompleteBaziAnalysis,
  StrengthEvidence,
} from '../../../types';
import { FEATURES, type FeatureFlags } from '../../../config/featureFlags';
import { analyzeBasicBazi } from '../basicAnalysis';
import { analyzeBaziRelations } from '../relations';
import { analyzeTenGods } from '../tenGods';
import { createConstraintEvidence } from './control';
import { createNamingTendencies } from './namingTendency';
import { createRootingEvidence } from './rooting';
import { createSeasonalEvidence } from './seasonalStrength';
import { resolveStrength } from './strengthResolver';
import { createSupportEvidence } from './support';
import { analyzeBasicTiaohou } from './tiaohou';
import { createBaziExplanationBundle } from '../../explanation';

function summarizeEvidence(
  evidence: readonly StrengthEvidence[],
  effect: StrengthEvidence['effect'],
): string {
  const reasons = evidence
    .filter((item) => item.effect === effect)
    .sort((left, right) => right.level - left.level)
    .slice(0, 2)
    .map(({ reason }) => reason.replace(/。$/, ''));

  return reasons.length > 0 ? reasons.join('；') : '无显著证据';
}

export function analyzeStrength(
  bazi: Bazi,
  analysis: BaziAnalysis,
): BaziStrengthAnalysis {
  const evidence = [
    ...createSeasonalEvidence(analysis),
    ...createRootingEvidence(bazi, analysis),
    ...createSupportEvidence(bazi, analysis),
    ...createConstraintEvidence(bazi, analysis),
  ];
  const resolution = resolveStrength(evidence);
  const monthCommandElement = analysis.pillars.month.branchElement;
  const tiaohou = analyzeBasicTiaohou(analysis.monthCommand);

  return {
    strength: resolution.strength,
    strengthRuleIds: ['bazi.strength.five-levels'],
    strengthBreakdown: {
      supportScore: resolution.supportScore,
      weakenScore: resolution.weakenScore,
      netScore: resolution.netScore,
      monthCommandElement,
      evidence,
    },
    tiaohou,
    strengthReason: `V2 证据模型判为${resolution.strength}；支持证据 ${resolution.supportScore}，制约证据 ${resolution.weakenScore}，净值 ${resolution.netScore}。主要支持：${summarizeEvidence(evidence, 'support')}。主要制约：${summarizeEvidence(evidence, 'weaken')}。`,
    namingTendencies: createNamingTendencies(
      resolution.strength,
      analysis.dayMaster.element,
      evidence,
      tiaohou,
    ),
  };
}

export function analyzeBazi(
  bazi: Bazi,
  features: Readonly<FeatureFlags> = FEATURES,
): CompleteBaziAnalysis {
  const basicAnalysis = analyzeBasicBazi(bazi);
  const analysis: CompleteBaziAnalysis = {
    ...basicAnalysis,
    ...analyzeStrength(bazi, basicAnalysis),
    relations: analyzeBaziRelations(bazi),
    ...(features.tenGods ? { tenGods: analyzeTenGods(bazi) } : {}),
  };

  return features.advancedExplanation
    ? { ...analysis, explanations: createBaziExplanationBundle(analysis) }
    : analysis;
}
