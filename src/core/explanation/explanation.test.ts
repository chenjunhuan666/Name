import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../config/featureFlags';
import { findBaziRule } from '../../data/baziRules';
import type {
  Bazi,
  CharacterPronunciation,
  ElementTendency,
  NamingCharacter,
} from '../../types';
import { analyzeBazi } from '../bazi/strength';
import { generateNames, generateNamesV2 } from '../naming/nameGenerator';
import {
  attachNameExplanations,
  createBaziExplanationBundle,
  createNameExplanationBundle,
} from './index';

const bazi: Bazi = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '壬', branch: '申' },
  day: { stem: '辛', branch: '酉' },
  hour: { stem: '丙', branch: '申' },
};

const characters: NamingCharacter[] = [
  ['清', 'qīng', 1, '水', '清澈明净'],
  ['宁', 'níng', 2, '火', '安宁平和'],
  ['景', 'jǐng', 3, '火', '日光景明'],
  ['和', 'hé', 2, '水', '温和协调'],
].map(([char, pinyin, tone, element, meaning], index) => ({
  char: char as string,
  pinyin: pinyin as string,
  tone: tone as 1 | 2 | 3 | 4,
  element: element as '水' | '火',
  elementConfidence: 0.9,
  elementBasis: ['测试资料'],
  strokes: 7 + index,
  meaning: meaning as string,
  gender: 'neutral',
  rarity: index / 10,
  styleTags: ['清雅', '温润'],
  negative: false,
}));

const tendencies: ElementTendency[] = [
  { element: '水', level: 5, relation: '生扶日主', weightedPresence: 1, reason: '测试倾向' },
  { element: '火', level: 3, relation: '制约日主', weightedPresence: 2, reason: '测试倾向' },
];

const pronunciations: CharacterPronunciation[] = [
  { char: '陈', pinyin: 'chén', tone: 2, strokes: 7 },
];

function textOf(bundle: ReturnType<typeof createBaziExplanationBundle>) {
  return [...bundle.ordinary, ...bundle.professional]
    .flatMap(({ title, summary, detail }) => [title, summary, detail ?? ''])
    .join('\n');
}

describe('Phase 5 explanation core', () => {
  it('统一输出普通与专业八字解释，并让所有 ruleId 都可追溯', () => {
    const analysis = analyzeBazi(bazi, {
      ...FEATURES,
      tenGods: true,
      advancedExplanation: false,
    });
    const bundle = createBaziExplanationBundle(analysis);

    expect(bundle.ordinary.map(({ title }) => title)).toEqual(
      expect.arrayContaining(['结构概览', '五行调节方向', '解释边界']),
    );
    expect(bundle.professional.map(({ id }) => ({ id }))).toEqual(
      expect.arrayContaining([
        { id: 'bazi-day-master' },
        { id: 'bazi-month-command' },
        { id: 'bazi-hidden-stems' },
        { id: 'bazi-strength-evidence' },
        { id: 'bazi-tiaohou' },
        { id: 'bazi-ten-gods' },
        { id: 'bazi-relations' },
        { id: 'bazi-naming-tendencies' },
      ]),
    );
    const ids = [...bundle.ordinary, ...bundle.professional].map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    const ruleIds = [...bundle.ordinary, ...bundle.professional]
      .flatMap(({ ruleIds = [] }) => ruleIds);
    expect(ruleIds.length).toBeGreaterThan(0);
    expect(ruleIds.every((ruleId) => Boolean(findBaziRule(ruleId)))).toBe(true);
    expect(textOf(bundle)).not.toMatch(/事业|婚姻|健康|命中注定|吉兆|凶兆/);
  });

  it('feature flag 关闭时保持旧分析，开启时只附加 core 解释', () => {
    const legacy = analyzeBazi(bazi, { ...FEATURES, advancedExplanation: false });
    const advanced = analyzeBazi(bazi, { ...FEATURES, advancedExplanation: true });
    const { explanations, ...advancedCore } = advanced;

    expect(legacy.explanations).toBeUndefined();
    expect(explanations?.ordinary.length).toBeGreaterThan(0);
    expect(explanations?.professional.length).toBeGreaterThan(0);
    expect(advancedCore).toEqual(legacy);
  });

  it('姓名解释由 core 输出推荐理由、注意点和八项专业评分', () => {
    const [name] = generateNamesV2({
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      limit: 20,
    });
    const bundle = createNameExplanationBundle(name);

    expect(bundle.ordinary.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'name-element-fit',
        'name-meaning',
        'name-phonetic',
        'name-homophone',
      ]),
    );
    expect(bundle.professional.filter(({ id }) => id.startsWith('name-score-')))
      .toHaveLength(8);
    expect(new Set(bundle.professional.map(({ id }) => id)).size)
      .toBe(bundle.professional.length);
    expect(textOf({ ordinary: bundle.ordinary, professional: bundle.professional }))
      .not.toMatch(/事业|婚姻|健康|命中注定|吉兆|凶兆/);
  });

  it('旧姓名可不带解释，新路径只附加只读解释而不改变分数与排序字段', () => {
    const names = generateNamesV2({
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      limit: 20,
    });
    const legacy = attachNameExplanations(names, false);
    const advanced = attachNameExplanations(names, true);

    expect(legacy).toBe(names);
    expect(advanced.map(({ givenName, score }) => ({ givenName, score })))
      .toEqual(names.map(({ givenName, score }) => ({ givenName, score })));
    expect(advanced.every(({ explanations }) => explanations?.ordinary.length))
      .toBe(true);
  });

  it('通过门禁后在公开分析与姓名生成路径启用解释', () => {
    const analysis = analyzeBazi(bazi);
    const names = generateNames({
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      limit: 20,
    });

    expect(FEATURES.advancedExplanation).toBe(true);
    expect(analysis.explanations?.ordinary.length).toBeGreaterThan(0);
    expect(analysis.explanations?.professional.length).toBeGreaterThan(0);
    expect(names.every(({ explanations }) => explanations?.ordinary.length))
      .toBe(true);
  });
});
