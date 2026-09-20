import { EARTHLY_BRANCHES } from '../../../data/earthlyBranches';
import type { Bazi, PillarKey, TenGodOccurrence } from '../../../types';
import { resolveTenGod } from './resolver';

const PILLAR_ORDER: readonly PillarKey[] = ['year', 'month', 'day', 'hour'];

export function analyzeTenGods(bazi: Bazi): TenGodOccurrence[] {
  const dayMasterStem = bazi.day.stem;

  return PILLAR_ORDER.flatMap((pillar) => {
    const occurrences: TenGodOccurrence[] = [];
    if (pillar !== 'day') {
      const stem = bazi[pillar].stem;
      const resolution = resolveTenGod(dayMasterStem, stem);
      occurrences.push({
        tenGod: resolution.tenGod,
        stem,
        pillar,
        location: 'stem',
        ruleIds: resolution.ruleIds,
      });
    }

    for (const hiddenStem of EARTHLY_BRANCHES[bazi[pillar].branch].hiddenStems) {
      const resolution = resolveTenGod(dayMasterStem, hiddenStem.stem);
      occurrences.push({
        tenGod: resolution.tenGod,
        stem: hiddenStem.stem,
        pillar,
        location: 'hidden-stem',
        hiddenRole: hiddenStem.role,
        ruleIds: [...resolution.ruleIds, 'bazi.hidden-stems.roles'],
      });
    }
    return occurrences;
  });
}

export { explainTenGodOccurrence } from './explanation';
export { resolveTenGod } from './resolver';
export { resolveTenGodRelation } from './relation';
