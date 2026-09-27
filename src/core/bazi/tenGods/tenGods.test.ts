import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../../config/featureFlags';
import { findBaziRule } from '../../../data/baziRules';
import type {
  Bazi,
  HeavenlyStem,
  NamingCharacter,
  TenGod,
} from '../../../types';
import { generateNames } from '../../naming/nameGenerator';
import { analyzeBazi } from '../strength';
import { explainTenGodOccurrence } from './explanation';
import { analyzeTenGods } from './index';
import { resolveTenGod } from './resolver';

const STEMS: readonly HeavenlyStem[] = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
];

const EXPECTED_MATRIX: Record<HeavenlyStem, readonly TenGod[]> = {
  甲: ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'],
  乙: ['劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
  丙: ['偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官'],
  丁: ['正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀'],
  戊: ['七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财'],
  己: ['正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财'],
  庚: ['偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官'],
  辛: ['正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神'],
  壬: ['食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财'],
  癸: ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩'],
};

const sampleBazi: Bazi = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '壬', branch: '申' },
  day: { stem: '辛', branch: '酉' },
  hour: { stem: '丙', branch: '申' },
};

const sourceCharacters: NamingCharacter[] = [
  ['景', 'jǐng', 3, '火'],
  ['和', 'hé', 2, '水'],
  ['安', 'ān', 1, '土'],
  ['承', 'chéng', 2, '金'],
].map(([char, pinyin, tone, element], index) => ({
  char: char as string,
  pinyin: pinyin as string,
  tone: tone as 1 | 2 | 3 | 4,
  element: element as NamingCharacter['element'],
  elementConfidence: 0.8,
  elementBasis: ['测试数据'],
  meaning: `${char as string}的正向含义`,
  gender: 'neutral',
  rarity: index / 10,
  styleTags: ['清雅'],
}));

describe('十神映射与运行时接入', () => {
  it('以固定 10×10 表验证全部日干和目标干映射', () => {
    for (const dayStem of STEMS) {
      expect(STEMS.map((targetStem) => resolveTenGod(dayStem, targetStem).tenGod))
        .toEqual(EXPECTED_MATRIX[dayStem]);
    }
  });

  it('按固定顺序输出显干和全部藏干，排除日干自身但保留日支藏干', () => {
    const occurrences = analyzeTenGods(sampleBazi);

    expect(
      occurrences.map(
        ({ pillar, location, hiddenRole, stem, tenGod }) =>
          `${pillar}:${location}:${hiddenRole ?? '-'}:${stem}:${tenGod}`,
      ),
    ).toEqual([
      'year:stem:-:甲:正财',
      'year:hidden-stem:main:戊:正印',
      'year:hidden-stem:middle:乙:偏财',
      'year:hidden-stem:residual:癸:食神',
      'month:stem:-:壬:伤官',
      'month:hidden-stem:main:庚:劫财',
      'month:hidden-stem:middle:壬:伤官',
      'month:hidden-stem:residual:戊:正印',
      'day:hidden-stem:main:辛:比肩',
      'hour:stem:-:丙:正官',
      'hour:hidden-stem:main:庚:劫财',
      'hour:hidden-stem:middle:壬:伤官',
      'hour:hidden-stem:residual:戊:正印',
    ]);
    expect(
      occurrences.some(
        ({ pillar, location }) => pillar === 'day' && location === 'stem',
      ),
    ).toBe(false);
    expect(analyzeTenGods(sampleBazi)).toEqual(occurrences);
  });

  it('每项同时关联五行关系、阴阳映射及可选藏干规则', () => {
    for (const occurrence of analyzeTenGods(sampleBazi)) {
      expect(
        occurrence.ruleIds.some((ruleId) =>
          ruleId.startsWith('bazi.ten-gods.relation.'),
        ),
      ).toBe(true);
      expect(
        occurrence.ruleIds.some((ruleId) =>
          ruleId.startsWith('bazi.ten-gods.polarity.'),
        ),
      ).toBe(true);
      if (occurrence.location === 'hidden-stem') {
        expect(occurrence.ruleIds).toContain('bazi.hidden-stems.roles');
      }
      for (const ruleId of occurrence.ruleIds) {
        const rule = findBaziRule(ruleId);
        expect(rule?.references.length, ruleId).toBeGreaterThan(0);
        if (ruleId.startsWith('bazi.ten-gods.')) {
          expect(rule?.enabledInV2, ruleId).toBe(false);
          expect(rule?.enabledInV3, ruleId).toBe(true);
        }
      }
    }
  });

  it('解释只描述传统结构，不输出命运或吉凶断语', () => {
    const explanation = explainTenGodOccurrence(analyzeTenGods(sampleBazi)[0]);

    expect(explanation).toContain('传统结构');
    expect(explanation).toContain('不作吉凶或现实命运判断');
  });

  it('feature flag 关闭时保持 V2 分析，开启时只增加十神字段', () => {
    expect(FEATURES.tenGods).toBe(true);
    const withoutTenGods = analyzeBazi(sampleBazi, {
      ...FEATURES,
      advancedExplanation: false,
      tenGods: false,
    });
    const withTenGods = analyzeBazi(sampleBazi, {
      ...FEATURES,
      advancedExplanation: false,
      tenGods: true,
    });
    const { tenGods, ...analysisWithoutTenGods } = withTenGods;

    expect(withoutTenGods.tenGods).toBeUndefined();
    expect(tenGods).toEqual(analyzeTenGods(sampleBazi));
    expect(analysisWithoutTenGods).toEqual(withoutTenGods);

    const baseNames = generateNames({
      surname: '陈',
      characters: sourceCharacters,
      tendencies: withoutTenGods.namingTendencies,
      limit: 20,
    });
    const namesWithTenGods = generateNames({
      surname: '陈',
      characters: sourceCharacters,
      tendencies: withTenGods.namingTendencies,
      limit: 20,
    });
    expect(namesWithTenGods).toEqual(baseNames);
  });
});
