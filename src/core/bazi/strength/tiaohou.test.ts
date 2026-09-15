import { describe, expect, it } from 'vitest';
import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import { createNamingTendencies } from './namingTendency';
import { analyzeBasicTiaohou } from './tiaohou';

describe('月令基础调候', () => {
  it('冬月与夏月输出不同方向并携带固定规则 ID', () => {
    expect(analyzeBasicTiaohou('子')).toMatchObject({
      climate: '偏寒',
      favoredElements: ['火'],
      adjustment: 1,
      ruleIds: ['bazi.tiaohou.basic'],
    });
    expect(analyzeBasicTiaohou('午')).toMatchObject({
      climate: '偏暖',
      favoredElements: ['水'],
      adjustment: 1,
      ruleIds: ['bazi.tiaohou.basic'],
    });
  });

  it('只上调对应起名倾向一档，不生成旺衰证据', () => {
    const neutral = createNamingTendencies('中和', '金', []);
    const adjusted = createNamingTendencies(
      '中和',
      '金',
      [],
      analyzeBasicTiaohou('子'),
    );
    const neutralFire = neutral.find(({ element }) => element === '火');
    const adjustedFire = adjusted.find(({ element }) => element === '火');

    expect(adjustedFire?.level).toBe((neutralFire?.level ?? 0) + 1);
    expect(adjustedFire?.ruleIds).toContain('bazi.tiaohou.basic');
  });

  it('起名倾向的基准档位与集中度调整统一由配置驱动', () => {
    const tendencies = createNamingTendencies('中和', '金', [
      {
        type: 'season',
        element: '火',
        effect: 'weaken',
        level: 5,
        reason: '测试集中度',
        ruleIds: ['test.concentration'],
      },
    ]);
    const fire = tendencies.find(({ element }) => element === '火');
    const configuredBase =
      BAZI_STRENGTH_CONFIG.namingTendencyBase['中和']['制约日主'];

    expect(fire?.level).toBe(
      configuredBase -
        BAZI_STRENGTH_CONFIG.namingTendencyConcentrationAdjustment,
    );
    expect(fire?.reason).toContain('项目模型下调一档');
  });
});
