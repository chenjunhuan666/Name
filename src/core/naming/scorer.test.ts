import { describe, expect, it } from 'vitest';
import type {
  ClassicReference,
  ElementTendency,
  HomophoneAssessment,
  NamingCharacter,
  PhoneticAssessment,
  SemanticPairAssessment,
} from '../../types';
import { NAMING_SCORE_WEIGHTS } from '../../config/namingScore';
import { scoreName, scoreNameV3 } from './scorer';

const characters: [NamingCharacter, NamingCharacter] = [
  {
    char: '林',
    pinyin: 'lín',
    tone: 2,
    element: '木',
    elementConfidence: 0.9,
    elementBasis: ['测试'],
    strokes: 8,
    meaning: '树木茂盛',
    gender: 'neutral',
    rarity: 0.1,
    styleTags: ['清雅', '沉稳'],
  },
  {
    char: '煦',
    pinyin: 'xù',
    tone: 4,
    element: '火',
    elementConfidence: 0.9,
    elementBasis: ['测试'],
    strokes: 12,
    meaning: '温暖和煦',
    gender: 'neutral',
    rarity: 0.3,
    styleTags: ['明朗', '温润'],
  },
];

const tendencies: ElementTendency[] = [
  {
    element: '木',
    level: 5,
    relation: '日主所生',
    weightedPresence: 1,
    reason: '测试倾向',
  },
  {
    element: '火',
    level: 4,
    relation: '日主所制',
    weightedPresence: 2,
    reason: '测试倾向',
  },
];

const phonetic: PhoneticAssessment = {
  score: 80,
  initials: ['l', 'x'],
  finals: ['in', 'u'],
  notes: ['音律测试。'],
};

const homophone: HomophoneAssessment = {
  safe: true,
  score: 100,
  normalizedFullName: 'linxu',
  matches: [],
};

const classic: ClassicReference = {
  workId: 'classic-test',
  source: 'shijing',
  book: '诗经',
  title: '测试篇目',
  text: '林煦',
  display: '《诗经·测试篇目》',
};

describe('scoreName', () => {
  it('八项配置权重合计为 100%，并按固定权重计算一位小数综合分', () => {
    expect(
      Object.values(NAMING_SCORE_WEIGHTS).reduce(
        (total, weight) => total + weight,
        0,
      ),
    ).toBeCloseTo(1);

    const result = scoreName({
      characters,
      tendencies,
      phonetic,
      homophone,
      surnameStrokes: [7],
    });

    expect(result.scoreBreakdown).toEqual({
      element: 95,
      meaning: 100,
      phonetic: 80,
      classic: 0,
      homophone: 100,
      modern: 80,
      shape: 100,
      rarity: 80,
    });
    expect(result.score).toBe(78.3);
  });

  it('只有真实出处存在时才计入文化出处权重', () => {
    const withoutClassic = scoreName({
      characters,
      tendencies,
      phonetic,
      homophone,
      surnameStrokes: [7],
    });
    const withClassic = scoreName({
      characters,
      tendencies,
      phonetic,
      homophone,
      surnameStrokes: [7],
      classic,
    });

    expect(withoutClassic.scoreBreakdown.classic).toBe(0);
    expect(withClassic.scoreBreakdown.classic).toBe(100);
    expect(withClassic.score - withoutClassic.score).toBe(15);
    expect(withClassic.scoreExplanations.classic).toContain(classic.display);
  });

  it('V3 在保持总权重不变时把语义角色关系计入现代审美', () => {
    const semanticBase: SemanticPairAssessment = {
      score: 80,
      natural: true,
      completeImage: true,
      styleConsistency: true,
      overlyPopular: false,
      overlyWebNovel: false,
      nameLike: true,
      notes: ['测试语义角色。'],
      semanticRoles: [['plant'], ['water']],
    };
    const coherent = scoreNameV3({
      characters,
      tendencies,
      phonetic,
      homophone,
      surnameStrokes: [7],
      semantic: { ...semanticBase, roleRelation: 'coherent' },
    });
    const fragment = scoreNameV3({
      characters,
      tendencies,
      phonetic,
      homophone,
      surnameStrokes: [7],
      semantic: { ...semanticBase, roleRelation: 'fragment' },
    });

    expect(coherent.scoreBreakdown.modern).toBeGreaterThan(
      fragment.scoreBreakdown.modern ?? 0,
    );
    expect(coherent.score).toBeGreaterThan(fragment.score);
    expect(Object.values(NAMING_SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(1);
  });
});
