/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ClassicWork } from '../../types';
import {
  createClassicPhraseIndex,
  findClassicReference,
} from './classicRepository';

const sampleWorks: ClassicWork[] = [
  {
    id: 'shijing-test',
    source: 'shijing',
    book: '诗经',
    title: '野有蔓草',
    author: '佚名',
    chapter: '国风·郑风',
    lines: ['有美一人，清扬婉兮。邂逅相遇，适我愿兮。'],
    display: '《诗经·国风·郑风·野有蔓草》',
  },
];

describe('典籍连续双字关联', () => {
  it('只关联原文中同序连续出现的名字', () => {
    const index = createClassicPhraseIndex(sampleWorks);
    const reference = index.get('清扬');

    expect(reference).toMatchObject({
      book: '诗经',
      title: '野有蔓草',
      text: '有美一人，清扬婉兮。邂逅相遇，适我愿兮。',
    });
    expect(index.has('扬清')).toBe(false);
    expect(findClassicReference('清扬', sampleWorks)).toEqual(reference);
  });

  it('不跨标点或非汉字间隔拼接出处', () => {
    const works: ClassicWork[] = [
      { ...sampleWorks[0], lines: ['清风徐来，水波不兴，扬帆远去。'] },
    ];

    expect(findClassicReference('清扬', works)).toBeUndefined();
  });
});

describe('基础典籍语料', () => {
  const works = JSON.parse(
    readFileSync(
      new URL('../../../public/data/classics/basic.json', import.meta.url),
      'utf8',
    ),
  ) as ClassicWork[];

  it('包含计划要求的四类基础数据', () => {
    const sourceCounts = Object.fromEntries(
      ['shijing', 'chuci', 'tang', 'songci'].map((source) => [
        source,
        works.filter((work) => work.source === source).length,
      ]),
    );

    expect(sourceCounts).toEqual({
      shijing: 305,
      chuci: 65,
      tang: 176,
      songci: 280,
    });
  });

  it('每条引用都包含可核对的篇名与原文', () => {
    expect(works).toHaveLength(826);
    works.forEach((work) => {
      expect(work.title.length).toBeGreaterThan(0);
      expect(work.display.length).toBeGreaterThan(0);
      expect(work.lines.length).toBeGreaterThan(0);
      work.lines.forEach((line) => expect(line.length).toBeGreaterThan(0));
    });
  });
});
