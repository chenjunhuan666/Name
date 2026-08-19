import { describe, expect, it } from 'vitest';
import { SIXTY_JIA_ZI } from '../../data/sixtyJiaZi';
import { validateBaziInput } from './baziValidator';

describe('validateBaziInput', () => {
  it('六十甲子表恰好包含 60 个无重复合法项', () => {
    expect(SIXTY_JIA_ZI).toHaveLength(60);
    expect(new Set(SIXTY_JIA_ZI)).toHaveLength(60);
    expect(SIXTY_JIA_ZI).not.toContain('甲丑');
  });

  it('拒绝缺失或不合法的四柱', () => {
    const result = validateBaziInput({
      year: '甲丑',
      month: '',
      day: '辛酉',
      hour: '丙申',
    });

    expect(result.isValid).toBe(false);

    if (!result.isValid) {
      expect(result.errors.year).toBe('年柱必须是合法六十甲子');
      expect(result.errors.month).toBe('请选择月柱');
    }
  });

  it('把合法四柱转换成统一 Bazi 对象', () => {
    const result = validateBaziInput({
      year: '甲辰',
      month: '壬申',
      day: '辛酉',
      hour: '丙申',
    });

    expect(result).toEqual({
      isValid: true,
      bazi: {
        year: { stem: '甲', branch: '辰' },
        month: { stem: '壬', branch: '申' },
        day: { stem: '辛', branch: '酉' },
        hour: { stem: '丙', branch: '申' },
      },
    });
  });
});
