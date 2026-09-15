import { describe, expect, it } from 'vitest';
import type {
  CharacterPronunciation,
  ClassicWork,
  ElementTendency,
  FiveElement,
  NamingCharacter,
} from '../../types';
import { generateNames } from './nameGenerator';

const elements: FiveElement[] = ['木', '火', '土', '金', '水'];
const sourceCharacters: NamingCharacter[] = [
  ['景', 'jǐng', 3, '火'],
  ['和', 'hé', 2, '水'],
  ['安', 'ān', 1, '土'],
  ['宁', 'níng', 2, '火'],
  ['承', 'chéng', 2, '金'],
  ['远', 'yuǎn', 3, '土'],
  ['清', 'qīng', 1, '水'],
  ['言', 'yán', 2, '木'],
].map(([char, pinyin, tone, element], index) => ({
  char: char as string,
  pinyin: pinyin as string,
  tone: tone as 1 | 2 | 3 | 4,
  element: element as FiveElement,
  elementConfidence: 0.7,
  elementBasis: ['测试数据'],
  radical: '一',
  strokes: 6 + index,
  meaning: `${char as string}的正向含义`,
  gender: 'neutral',
  rarity: index % 2 ? 0.25 : 0,
  styleTags: ['清雅', '书卷'],
  negative: false,
}));
const tendencies: ElementTendency[] = elements.map((element, index) => ({
  element,
  level: (5 - index) as 1 | 2 | 3 | 4 | 5,
  relation: '日主所生',
  weightedPresence: index,
  reason: `${element}测试倾向`,
}));
const pronunciations: CharacterPronunciation[] = [
  { char: '陈', pinyin: 'chén', tone: 2, strokes: 7 },
];
const classicWorks: ClassicWork[] = [
  {
    id: 'shijing-test',
    source: 'shijing',
    book: '诗经',
    title: '野有蔓草',
    author: '佚名',
    chapter: '国风·郑风',
    lines: ['有美一人，清扬婉兮。'],
    display: '《诗经·国风·郑风·野有蔓草》',
  },
];

describe('generateNames', () => {
  it('确定性生成至少二十个候选并按综合分降序排列', () => {
    const first = generateNames({
      surname: '陈',
      characters: sourceCharacters,
      tendencies,
      pronunciations,
      limit: 30,
    });
    const second = generateNames({
      surname: '陈',
      characters: sourceCharacters,
      tendencies,
      pronunciations,
      limit: 30,
    });

    expect(first.length).toBeGreaterThanOrEqual(20);
    expect(first.length).toBeLessThanOrEqual(30);
    expect(second).toEqual(first);
    expect(first.every((name) => name.fullName.startsWith('陈'))).toBe(true);
    expect(
      first.every((name, index) => index === 0 || first[index - 1].score >= name.score),
    ).toBe(true);
    expect(first[0].scoreBreakdown.classic).toBe(0);
    expect(new Set(first.map((name) => name.id)).size).toBe(first.length);
    expect(
      Math.max(
        ...Object.values(
          Object.fromEntries(
            [...new Set(first.map((name) => name.givenName[0]))].map((char) => [
              char,
              first.filter((name) => name.givenName[0] === char).length,
            ]),
          ),
        ),
      ),
    ).toBeLessThanOrEqual(4);
  });

  it('候选排名不依赖来源数组的前 100 个位置', () => {
    const forward = generateNames({
      surname: '陈',
      characters: sourceCharacters,
      tendencies,
      pronunciations,
      limit: 20,
    });
    const reversed = generateNames({
      surname: '陈',
      characters: [...sourceCharacters].reverse(),
      tendencies,
      pronunciations,
      limit: 20,
    });

    expect(reversed).toEqual(forward);
  });

  it('在组合层执行包含字、排除字与生僻度偏好', () => {
    const names = generateNames({
      surname: '陈',
      characters: sourceCharacters,
      tendencies,
      pronunciations,
      preference: {
        styles: ['清雅'],
        includeCharacters: ['清'],
        excludeCharacters: ['安'],
        rarityPreference: 'balanced',
        genderExpression: 'neutral',
      },
      limit: 20,
    });

    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => name.givenName.includes('清'))).toBe(true);
    expect(names.every((name) => !name.givenName.includes('安'))).toBe(true);
  });

  it('在生成层执行用户排除风格', () => {
    const names = generateNames({
      surname: '陈',
      characters: [
        sourceCharacters[0],
        sourceCharacters[1],
        { ...sourceCharacters[2], styleTags: ['温润'] },
        { ...sourceCharacters[3], styleTags: ['温润'] },
      ],
      tendencies,
      pronunciations,
      preference: {
        styles: [],
        excludeStyles: ['清雅'],
        rarityPreference: 'balanced',
        genderExpression: 'neutral',
      },
      limit: 20,
    });

    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => name.styleTags.includes('温润'))).toBe(true);
    expect(names.every((name) => !name.styleTags.includes('清雅'))).toBe(true);
  });

  it('移除姓与名组合命中的明显负面谐音', () => {
    const riskyCharacters: NamingCharacter[] = [
      { ...sourceCharacters[0], char: '珍', pinyin: 'zhēn', tone: 1 },
      { ...sourceCharacters[1], char: '香', pinyin: 'xiāng', tone: 1 },
      ...sourceCharacters.slice(2, 5),
    ];

    const names = generateNames({
      surname: '史',
      characters: riskyCharacters,
      tendencies,
      pronunciations: [{ char: '史', pinyin: 'shǐ', tone: 3, strokes: 5 }],
      limit: 30,
    });

    expect(names.some((name) => name.givenName === '珍香')).toBe(false);
  });

  it('仅为原文连续命中的名字补充可核对出处并计入文化分', () => {
    const characters: NamingCharacter[] = [
      sourceCharacters[6],
      { ...sourceCharacters[7], char: '扬', pinyin: 'yáng', tone: 2 },
      ...sourceCharacters.slice(0, 2),
    ];
    const names = generateNames({
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      classicWorks,
      limit: 20,
    });
    const matched = names.find((name) => name.givenName === '清扬');
    const reversed = names.find((name) => name.givenName === '扬清');

    expect(matched?.classic?.display).toBe('《诗经·国风·郑风·野有蔓草》');
    expect(matched?.scoreBreakdown.classic).toBe(100);
    expect(reversed?.classic).toBeUndefined();
    expect(reversed?.scoreBreakdown.classic).toBe(0);
  });

  it('典籍偏好选中时只保留真实命中的对应来源', () => {
    const characters: NamingCharacter[] = [
      sourceCharacters[6],
      { ...sourceCharacters[7], char: '扬', pinyin: 'yáng', tone: 2 },
      ...sourceCharacters.slice(0, 2),
    ];
    const names = generateNames({
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      classicWorks,
      preference: {
        styles: ['清雅'],
        rarityPreference: 'balanced',
        genderExpression: 'neutral',
        classicPreference: 'shijing',
      },
      limit: 20,
    });

    expect(names.map(({ givenName }) => givenName)).toEqual(['清扬']);
    expect(names[0].classic?.source).toBe('shijing');
  });
});
