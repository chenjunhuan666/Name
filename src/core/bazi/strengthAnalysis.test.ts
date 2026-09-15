import { describe, expect, it } from 'vitest';
import type { Bazi, FiveElement } from '../../types';
import { analyzeBazi } from './strengthAnalysis';

const strongMetalBazi: Bazi = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '壬', branch: '申' },
  day: { stem: '辛', branch: '酉' },
  hour: { stem: '丙', branch: '申' },
};

const weakMetalBazi: Bazi = {
  year: { stem: '甲', branch: '寅' },
  month: { stem: '乙', branch: '卯' },
  day: { stem: '庚', branch: '申' },
  hour: { stem: '丙', branch: '午' },
};

const balancedWoodBazi: Bazi = {
  year: { stem: '戊', branch: '辰' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '甲', branch: '子' },
  hour: { stem: '庚', branch: '申' },
};

function tendencyLevels(
  bazi: Bazi,
): Record<FiveElement, number> {
  return Object.fromEntries(
    analyzeBazi(bazi).namingTendencies.map(({ element, level }) => [
      element,
      level,
    ]),
  ) as Record<FiveElement, number>;
}

describe('analyzeBazi', () => {
  it('综合月令、季节和根气，识别偏旺的金日主', () => {
    const analysis = analyzeBazi(strongMetalBazi);

    expect(analysis.strength).toBe('偏旺');
    expect(analysis.strengthBreakdown.supportScore).toBeGreaterThan(
      analysis.strengthBreakdown.weakenScore,
    );
    expect(analysis.strengthBreakdown.evidence.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['month-command', 'season', 'root', 'support', 'control']),
    );
  });

  it('识别偏弱日主，并只优先推荐生扶关系', () => {
    const analysis = analyzeBazi(weakMetalBazi);

    expect(analysis.strength).toBe('偏弱');
    expect(analysis.strengthBreakdown.weakenScore).toBeGreaterThan(
      analysis.strengthBreakdown.supportScore,
    );
    expect(tendencyLevels(weakMetalBazi).土).toBeGreaterThan(
      tendencyLevels(weakMetalBazi).火,
    );
  });

  it('在支持与制约同时明显时保留稍旺档位', () => {
    const analysis = analyzeBazi(balancedWoodBazi);

    expect(analysis.strength).toBe('偏旺');
    expect(analysis.strengthBreakdown.netScore).toBeGreaterThan(0);
  });

  it('起名倾向按星级降序输出，并为每项提供规则理由', () => {
    const analysis = analyzeBazi(strongMetalBazi);

    const levels = analysis.namingTendencies.map(({ level }) => level);
    expect(levels).toEqual([...levels].sort((left, right) => right - left));
    analysis.namingTendencies.forEach(({ reason, ruleIds }) => {
      expect(reason.length).toBeGreaterThan(20);
      expect(ruleIds).toContain('bazi.naming-tendency.fuyi');
    });
    analysis.strengthBreakdown.evidence.forEach(({ ruleIds }) => {
      expect(ruleIds.length).toBeGreaterThan(0);
    });
    expect(analysis.strengthRuleIds).toContain('bazi.strength.five-levels');
    expect(analysis.strengthReason).toContain('V2 证据模型');
  });
});
