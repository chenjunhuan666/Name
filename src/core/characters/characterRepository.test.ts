/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CharacterPronunciation, NamingCharacter } from '../../types';
import { filterCharacters } from './characterRepository';

const characters: NamingCharacter[] = [
  {
    char: '澄',
    pinyin: 'chéng',
    tone: 2,
    element: '水',
    elementConfidence: 0.7,
    elementBasis: ['开源字典五行分类'],
    meaning: '清澈、明净',
    gender: 'neutral',
    rarity: 0.25,
    styleTags: ['清雅', '明朗'],
  },
  {
    char: '毅',
    pinyin: 'yì',
    tone: 4,
    element: '木',
    elementConfidence: 0.7,
    elementBasis: ['开源字典五行分类'],
    meaning: '坚定、果决',
    gender: 'male',
    rarity: 0,
    styleTags: ['刚健'],
  },
  {
    char: '婉',
    pinyin: 'wǎn',
    tone: 3,
    element: '土',
    elementConfidence: 0.7,
    elementBasis: ['开源字典五行分类'],
    meaning: '温和、美好',
    gender: 'female',
    rarity: 0,
    styleTags: ['温婉'],
  },
  {
    char: '灏',
    pinyin: 'hào',
    tone: 4,
    element: ['水', '火'],
    elementConfidence: 0.55,
    elementBasis: ['字形', '字义'],
    meaning: '水势浩大',
    gender: 'neutral',
    rarity: 0.75,
    styleTags: ['大气'],
  },
  {
    char: '哀',
    pinyin: 'āi',
    tone: 1,
    element: '土',
    elementConfidence: 0.7,
    elementBasis: ['开源字典五行分类'],
    meaning: '悲伤',
    gender: 'neutral',
    rarity: 0,
    styleTags: ['沉稳'],
    negative: true,
  },
];

describe('filterCharacters', () => {
  it('按五行筛选，并兼容多五行字符', () => {
    expect(
      filterCharacters(characters, { elements: ['水'] }).map(
        ({ char }) => char,
      ),
    ).toEqual(['澄', '灏']);
  });

  it('按宝宝性别筛选时保留中性字', () => {
    expect(
      filterCharacters(characters, { gender: 'male' }).map(
        ({ char }) => char,
      ),
    ).toEqual(['澄', '毅', '灏']);
    expect(
      filterCharacters(characters, { gender: 'female' }).map(
        ({ char }) => char,
      ),
    ).toEqual(['澄', '婉', '灏']);
  });

  it('可组合风格与生僻度条件', () => {
    expect(
      filterCharacters(characters, {
        styleTags: ['清雅'],
        maxRarity: 0.5,
      }).map(({ char }) => char),
    ).toEqual(['澄']);
  });

  it('始终排除标记为负面含义的字', () => {
    expect(
      filterCharacters(characters, { elements: ['土'] }).map(
        ({ char }) => char,
      ),
    ).toEqual(['婉']);
  });

  it('支持按汉字、拼音或字义检索', () => {
    expect(filterCharacters(characters, { query: 'cheng' })).toHaveLength(1);
    expect(filterCharacters(characters, { query: '坚定' })).toHaveLength(1);
  });
});

describe('基础汉字库数据', () => {
  const library = JSON.parse(
    readFileSync(
      new URL('../../../public/data/characters/basic.json', import.meta.url),
      'utf8',
    ),
  ) as NamingCharacter[];

  it('规模符合 Phase 5 的 1000～3000 字范围', () => {
    expect(library.length).toBeGreaterThanOrEqual(1000);
    expect(library.length).toBeLessThanOrEqual(3000);
  });

  it('每个字符都具备筛选所需的核心字段', () => {
    library.forEach((character) => {
      expect(character.char).toMatch(/^\p{Script=Han}$/u);
      expect(character.pinyin.length).toBeGreaterThan(0);
      expect([1, 2, 3, 4]).toContain(character.tone);
      expect(character.meaning.length).toBeGreaterThan(0);
      expect(character.elementBasis.length).toBeGreaterThan(0);
      expect(character.styleTags.length).toBeGreaterThan(0);
      expect(character.rarity).toBeLessThanOrEqual(0.5);
    });
  });

  it('五行分类均有足够候选字', () => {
    const counts = Object.fromEntries(
      ['木', '火', '土', '金', '水'].map((element) => [
        element,
        filterCharacters(library, {
          elements: [element as '木' | '火' | '土' | '金' | '水'],
        }).length,
      ]),
    );

    Object.values(counts).forEach((count) => {
      expect(count).toBeGreaterThan(100);
    });
  });
});

describe('姓名读音索引', () => {
  const pronunciations = JSON.parse(
    readFileSync(
      new URL(
        '../../../public/data/characters/pronunciations.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as CharacterPronunciation[];

  it('覆盖常见姓氏并包含音调与笔画', () => {
    expect(pronunciations.length).toBeGreaterThan(6000);
    expect(pronunciations.find(({ char }) => char === '陈')).toEqual({
      char: '陈',
      pinyin: 'chén',
      tone: 2,
      strokes: 7,
    });
  });
});
