/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClassicWork } from '../../types';
import {
  createClassicPhraseIndex,
  findClassicReference,
  loadClassicCharacterSources,
  loadClassicLibrary,
  loadClassicLibraryWithDiagnostics,
  mergeClassicImageryRegistry,
} from './classicRepository';

afterEach(() => {
  vi.unstubAllGlobals();
});

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

const v2Index = JSON.parse(
  readFileSync(
    new URL('../../../public/data/classics/index.json', import.meta.url),
    'utf8',
  ),
) as {
  packages: Array<{
    source: string;
    path: string;
    workCount: number;
    available: boolean;
  }>;
};
const phase6Works = v2Index.packages.flatMap(({ path }) =>
  JSON.parse(
    readFileSync(new URL(`../../../public/data/classics/${path}`, import.meta.url), 'utf8'),
  ) as ClassicWork[],
);
const characterSourceRegistry = JSON.parse(
  readFileSync(
    new URL('../../../public/data/classics/character-sources.json', import.meta.url),
    'utf8',
  ),
) as {
  level: 'D';
  use: 'character-only';
  entries: Array<{
    char: string;
    text: string;
    level: 'D';
    use: 'character-only';
    givenName?: string;
  }>;
};
const zhouyiWorks = JSON.parse(
  readFileSync(
    new URL('../../../public/data/classics/core/zhouyi.json', import.meta.url),
    'utf8',
  ),
) as ClassicWork[];
const zhuangziWorks = JSON.parse(
  readFileSync(
    new URL('../../../public/data/classics/core/zhuangzi.json', import.meta.url),
    'utf8',
  ),
) as ClassicWork[];

describe('典籍 A/B/C 分级关联', () => {
  it('同一只读典籍数组复用已构建索引，避免筛选交互反复扫描全部原文', () => {
    expect(createClassicPhraseIndex(sampleWorks)).toBe(
      createClassicPhraseIndex(sampleWorks),
    );
  });

  it('A 级优先关联原文中同序连续出现的名字', () => {
    const index = createClassicPhraseIndex(sampleWorks);
    const reference = index.get('清扬');

    expect(reference).toMatchObject({
      book: '诗经',
      title: '野有蔓草',
      text: '有美一人，清扬婉兮。邂逅相遇，适我愿兮。',
      level: 'A',
      matchType: 'exact-phrase',
    });
    expect(index.has('扬清')).toBe(false);
    expect(findClassicReference('清扬', sampleWorks)).toEqual(reference);
  });

  it('B 级只允许两字在同一分句中按原顺序出现', () => {
    const works: ClassicWork[] = [
      { ...sampleWorks[0], lines: ['清风徐来扬帆远去。'] },
    ];

    expect(findClassicReference('清扬', works)).toMatchObject({
      level: 'B',
      matchType: 'same-sentence',
    });
    expect(findClassicReference('扬清', works)).toBeUndefined();
  });

  it('不跨标点拼接 B 级出处', () => {
    const works: ClassicWork[] = [
      { ...sampleWorks[0], lines: ['清风徐来，水波不兴，扬帆远去。'] },
    ];

    expect(findClassicReference('清扬', works)).toBeUndefined();
  });

  it('C 级只接受人工登记的同篇意象化用', () => {
    const works: ClassicWork[] = [
      {
        ...sampleWorks[0],
        imageryNames: [
          { givenName: '澄和', explanation: '取全篇清雅和悦的整体意象。' },
        ],
      },
    ];

    expect(findClassicReference('澄和', works)).toMatchObject({
      level: 'C',
      matchType: 'same-work-imagery',
      explanation: '取全篇清雅和悦的整体意象。',
    });
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

describe('V2 补充典籍语料', () => {
  it('把人工登记表合并为可追溯 C 级生产关联', () => {
    const registry = JSON.parse(
      readFileSync(
        new URL('../../../public/data/classics/manual-imagery.json', import.meta.url),
        'utf8',
      ),
    );
    const works = mergeClassicImageryRegistry(
      [...JSON.parse(readFileSync(new URL('../../../public/data/classics/core/shijing.json', import.meta.url), 'utf8')), ...zhouyiWorks],
      registry,
    );

    expect(findClassicReference('洲宁', works)).toMatchObject({
      workId: 'shijing-001',
      level: 'C',
      matchType: 'same-work-imagery',
    });
    expect(findClassicReference('健行', works)).toMatchObject({
      workId: 'zhouyi-001',
      level: 'C',
      matchType: 'same-work-imagery',
      text: '《象》曰：天行健，君子以自强不息。',
    });
  });

  it('索引启用完整的周易与庄子分包', () => {
    expect(
      v2Index.packages.find(({ source }) => source === 'zhouyi'),
    ).toMatchObject({ workCount: 69, available: true });
    expect(
      v2Index.packages.find(({ source }) => source === 'zhuangzi'),
    ).toMatchObject({ workCount: 33, available: true });
    expect(zhouyiWorks).toHaveLength(69);
    expect(zhuangziWorks).toHaveLength(33);
  });

  it('周易保持 64 卦唯一顺序并清除来源中的重复屯卦', () => {
    expect(zhouyiWorks.slice(0, 4).map(({ title }) => title)).toEqual([
      '乾',
      '坤',
      '屯',
      '蒙',
    ]);
    expect(zhouyiWorks.filter(({ title }) => title === '屯')).toHaveLength(1);
    expect(
      zhouyiWorks[0].lines.some((line) => line.includes('自强不息')),
    ).toBe(true);
  });

  it('庄子包含 33 篇正文且不保留数字化元数据标记', () => {
    expect(zhuangziWorks[0]).toMatchObject({
      title: '逍遙遊',
      display: '《庄子·逍遙遊》',
    });
    expect(zhuangziWorks[0].lines.join('')).toContain('北冥有魚');
    expect(
      zhuangziWorks.every(({ lines }) =>
        lines.every(
          (line) =>
            !line.includes('<pb:') &&
            !line.includes('# src:') &&
            !line.includes('¶'),
        ),
      ),
    ).toBe(true);
  });
});

describe('Phase 6 典籍标签与 D 级单字来源', () => {
  it('为全部 962 篇典籍提供可检索的主题、风格与适名度标签', () => {
    expect(phase6Works).toHaveLength(962);
    phase6Works.forEach(({ tags }) => {
      expect(tags?.themes.length).toBeGreaterThan(0);
      expect(tags?.styles.length).toBeGreaterThan(0);
      expect(tags?.suitability).toBeGreaterThanOrEqual(0);
      expect(tags?.suitability).toBeLessThanOrEqual(100);
    });
  });

  it('D 级登记表只表达单字原文出现，不进入双字 A/B/C 出处结构', () => {
    expect(characterSourceRegistry).toMatchObject({
      level: 'D',
      use: 'character-only',
    });
    expect(characterSourceRegistry.entries).toHaveLength(1879);
    expect(
      characterSourceRegistry.entries.every(
        ({ char, text, level, use, givenName }) =>
          Array.from(char).length === 1 &&
          text.includes(char) &&
          level === 'D' &&
          use === 'character-only' &&
          givenName === undefined,
      ),
    ).toBe(true);
    expect(
      [...createClassicPhraseIndex(sampleWorks).values()].every(({ level }) =>
        ['A', 'B', 'C'].includes(level ?? ''),
      ),
    ).toBe(true);
  });

  it('按独立入口加载 D 级登记表并校验单字证据', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const requestPath = String(input);
        return {
          ok: true,
          status: 200,
          json: async () =>
            requestPath.endsWith('index.json')
              ? {
                  schemaVersion: 3,
                  packages: [],
                  characterSourceRegistry: {
                    path: 'character-sources.json',
                    entryCount: characterSourceRegistry.entries.length,
                    level: 'D',
                    use: 'character-only',
                  },
                }
              : characterSourceRegistry,
        };
      }),
    );

    await expect(loadClassicCharacterSources()).resolves.toHaveLength(1879);
  });
});

describe('典籍资源降级加载', () => {
  it('单个典籍分包失败时保留已成功分包并返回诊断', async () => {
    const availableWork = sampleWorks[0];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const path = String(input);
        if (path.endsWith('data/classics/index.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              schemaVersion: 2,
              packages: [
                {
                  source: 'shijing',
                  path: 'core/shijing.json',
                  workCount: 1,
                  available: true,
                  load: 'on-demand',
                },
                {
                  source: 'chuci',
                  path: 'core/chuci.json',
                  workCount: 1,
                  available: true,
                  load: 'on-demand',
                },
              ],
            }),
          };
        }
        if (path.endsWith('data/classics/core/shijing.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => [availableWork],
          };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }),
    );

    const result = await loadClassicLibraryWithDiagnostics();

    expect(result.works).toEqual([availableWork]);
    expect(result.warnings).toEqual([
      'chuci 典籍分包加载失败（HTTP 503）',
    ]);
  });

  it('典籍索引整体不可用时返回空典籍，不中断调用方核心数据流', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
      })),
    );

    await expect(loadClassicLibrary()).resolves.toEqual([]);
    await expect(loadClassicLibraryWithDiagnostics()).resolves.toEqual({
      works: [],
      warnings: ['典籍索引加载失败（HTTP 404）'],
    });
  });
});
