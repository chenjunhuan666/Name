import { describe, expect, it } from 'vitest';
import type { Bazi } from '../../../types';
import { analyzeBasicBazi } from '../basicAnalysis';
import { createRootingEvidence } from './rooting';

describe('createRootingEvidence', () => {
  it('区分主气根与余气根的证据等级', () => {
    const bazi: Bazi = {
      year: { stem: '庚', branch: '辰' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: '甲', branch: '子' },
      hour: { stem: '戊', branch: '亥' },
    };
    const evidence = createRootingEvidence(bazi, analyzeBasicBazi(bazi));
    const mainRoot = evidence.find(({ reason }) => reason.includes('寅的主气甲'));
    const residualRoot = evidence.find(({ reason }) => reason.includes('辰的中气乙'));

    expect(mainRoot?.level).toBe(5);
    expect(residualRoot?.level).toBe(2);
    expect(mainRoot?.ruleIds).toContain('bazi.rooting.evidence');
  });
});
