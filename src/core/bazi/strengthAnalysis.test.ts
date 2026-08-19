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
  it('将月令作为额外权重，识别偏旺的金日主', () => {
    const analysis = analyzeBazi(strongMetalBazi);

    expect(analysis.strength).toBe('偏旺');
    expect(analysis.strengthBreakdown.supportRatio).toBe(66);
    expect(analysis.strengthBreakdown.weightedElements).toEqual({
      木: 1.5,
      火: 1,
      土: 2.5,
      金: 7,
      水: 2.5,
    });
    expect(tendencyLevels(strongMetalBazi)).toEqual({
      木: 3,
      火: 5,
      土: 1,
      金: 1,
      水: 5,
    });
  });

  it('识别偏弱日主，并只优先推荐生扶关系', () => {
    const analysis = analyzeBazi(weakMetalBazi);

    expect(analysis.strength).toBe('偏弱');
    expect(analysis.strengthBreakdown.supportRatio).toBe(29);
    expect(tendencyLevels(weakMetalBazi)).toEqual({
      木: 1,
      火: 1,
      土: 5,
      金: 4,
      水: 2,
    });
  });

  it('将支持比例落在中间区间的结构判为中和', () => {
    const analysis = analyzeBazi(balancedWoodBazi);

    expect(analysis.strength).toBe('中和');
    expect(analysis.strengthBreakdown.supportRatio).toBe(48);
    expect(tendencyLevels(balancedWoodBazi)).toEqual({
      木: 2,
      火: 4,
      土: 3,
      金: 3,
      水: 3,
    });
  });

  it('起名倾向按星级降序输出，并为每项提供规则理由', () => {
    const analysis = analyzeBazi(strongMetalBazi);

    expect(analysis.namingTendencies.map(({ level }) => level)).toEqual([
      5, 5, 3, 1, 1,
    ]);
    analysis.namingTendencies.forEach(({ reason }) => {
      expect(reason.length).toBeGreaterThan(20);
    });
    expect(analysis.strengthReason).toContain('V1 加权模型');
  });
});
