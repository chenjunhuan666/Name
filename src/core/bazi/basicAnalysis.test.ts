import { describe, expect, it } from 'vitest';
import { analyzeBasicBazi } from './basicAnalysis';
import type { Bazi } from '../../types';

const sampleBazi: Bazi = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '壬', branch: '申' },
  day: { stem: '辛', branch: '酉' },
  hour: { stem: '丙', branch: '申' },
};

describe('analyzeBasicBazi', () => {
  it('识别日主和月令', () => {
    const analysis = analyzeBasicBazi(sampleBazi);

    expect(analysis.dayMaster).toEqual({
      stem: '辛',
      element: '金',
      yinYang: '阴',
    });
    expect(analysis.monthCommand).toBe('申');
  });

  it('分别统计表层五行与藏干五行', () => {
    const analysis = analyzeBasicBazi(sampleBazi);

    expect(analysis.surfaceElements).toEqual({
      木: 1,
      火: 1,
      土: 1,
      金: 4,
      水: 1,
    });
    expect(analysis.hiddenElements).toEqual({
      木: 1,
      火: 0,
      土: 3,
      金: 3,
      水: 3,
    });
  });

  it('保留每一柱的地支藏干明细', () => {
    const analysis = analyzeBasicBazi(sampleBazi);

    expect(analysis.pillars.year.hiddenStems.map(({ stem }) => stem)).toEqual([
      '戊',
      '乙',
      '癸',
    ]);
    expect(analysis.pillars.month.hiddenStems.map(({ stem }) => stem)).toEqual([
      '庚',
      '壬',
      '戊',
    ]);
    expect(analysis.pillars.day.hiddenStems.map(({ stem }) => stem)).toEqual([
      '辛',
    ]);
  });
});
