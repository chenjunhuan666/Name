import { describe, expect, it } from 'vitest';
import { findBaziRule } from '../../data/baziRules';
import type { PillarKey } from '../../types';
import { analyzeBazi } from './strengthAnalysis';
import { BAZI_GOLDEN_CASES, type GoldenEvidenceExpectation } from './goldenCases';

const PILLAR_KEYS: readonly PillarKey[] = ['year', 'month', 'day', 'hour'];

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function hasEvidence(
  evidence: readonly {
    type: string;
    element: string;
    effect: string;
    level: number;
    ruleIds: readonly string[];
  }[],
  expected: GoldenEvidenceExpectation,
): boolean {
  return evidence.some((actual) =>
    actual.type === expected.type
    && actual.element === expected.element
    && actual.effect === expected.effect
    && actual.level === expected.level
    && sorted(actual.ruleIds).join('|') === sorted(expected.ruleIds).join('|'));
}

describe('八字 Golden Cases', () => {
  it.each(BAZI_GOLDEN_CASES)('$id 固定基础结构、关系、旺衰证据与来源链', ({ expected, bazi }) => {
    const analysis = analyzeBazi(bazi);

    expect(analysis.dayMaster).toEqual(expected.structure.dayMaster);
    expect(analysis.monthCommand).toBe(expected.structure.monthCommand);
    expect(analysis.surfaceElements).toEqual(expected.structure.surfaceElements);
    expect(analysis.hiddenElements).toEqual(expected.structure.hiddenElements);
    for (const pillar of PILLAR_KEYS) {
      expect(analysis.pillars[pillar].hiddenStems.map(({ stem, role }) => ({ stem, role })))
        .toEqual(expected.structure.hiddenStems[pillar]);
    }

    expect(analysis.relations?.map(({ id, kind, ruleId }) => ({ id, kind, ruleId })))
      .toEqual(expected.relations);
    expect(analysis.relations?.every(({ interpretation }) => interpretation === 'structural-only')).toBe(true);

    expect(analysis.strength).toBe(expected.strength.value);
    expect(analysis.strengthBreakdown).toMatchObject({
      supportScore: expected.strength.supportScore,
      weakenScore: expected.strength.weakenScore,
      netScore: expected.strength.netScore,
    });
    for (const evidence of expected.strength.keyEvidence) {
      expect(hasEvidence(analysis.strengthBreakdown.evidence, evidence)).toBe(true);
    }
    expect(analysis.tiaohou).toMatchObject(expected.tiaohou);
    expect(analysis.tiaohou.monthCommand).toBe(expected.structure.monthCommand);

    const emittedRuleIds = new Set([
      ...analysis.strengthRuleIds,
      ...analysis.strengthBreakdown.evidence.flatMap(({ ruleIds }) => ruleIds),
      ...analysis.namingTendencies.flatMap(({ ruleIds = [] }) => ruleIds),
      ...analysis.tiaohou.ruleIds,
      ...(analysis.relations ?? []).map(({ ruleId }) => ruleId),
    ]);
    expect(sorted([...emittedRuleIds])).toEqual(sorted(expected.ruleIds));

    const referenceIds = new Set(
      [...emittedRuleIds].flatMap((ruleId) => findBaziRule(ruleId)?.references.map(({ id }) => id) ?? []),
    );
    expect(sorted([...referenceIds])).toEqual(sorted(expected.referenceIds));
  });

  it('每个 Golden Case 的规则与来源均可由项目目录解析', () => {
    for (const goldenCase of BAZI_GOLDEN_CASES) {
      for (const ruleId of goldenCase.expected.ruleIds) {
        const rule = findBaziRule(ruleId);
        expect(rule, `${goldenCase.id} 缺少规则 ${ruleId}`).toBeDefined();
        expect(rule?.references.length, `${ruleId} 缺少参考来源`).toBeGreaterThan(0);
      }
    }
  });
});
