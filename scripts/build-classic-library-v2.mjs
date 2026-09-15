import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = process.argv[2];
const zhouyiSourcePath = process.argv[3];
const zhuangziSourceRoot = process.argv[4];
const outputRoot = process.argv[5] ?? 'public/data/classics';

if (!sourceRoot || !zhouyiSourcePath || !zhuangziSourceRoot) {
  throw new Error(
    '请依次提供 chinese-poetry 根目录、chinese-classical-corpus/output/wujing/zhouyi.json 和 Kanripo KR5c0126 根目录',
  );
}

const CHINESE_POETRY_COMMIT =
  'b8594f81a89752241442f2ce267d6f66f96704ee';
const ZHOUYI_COMMIT = '09a6873e46760f20027e20bf48814f5c5cc05d66';
const ZHUANGZI_COMMIT = 'abb9cd323dfd9520894b56b3b8ba2ec0ea50554f';
const MANUAL_IMAGERY_REGISTRY = {
  schemaVersion: 1,
  policy: 'C 级仅登记同篇整体意象，不能覆盖 A/B 级原文关联。',
  reviewedAt: '2026-09-12',
  entries: [
    {
      workId: 'shijing-001',
      givenName: '洲宁',
      explanation:
        '取《关雎》河洲、琴瑟相友的安宁和谐整体意象；两字不是原文连续或同句抽取。',
      evidenceText: '关关雎鸠，在河之洲。窈窕淑女，君子好逑。',
    },
    {
      workId: 'zhouyi-001',
      givenName: '健行',
      explanation:
        '取《乾》天行健与自强不息的整体意象；采用意象重组，不宣称原文出现“健行”。',
      evidenceText: '《象》曰：天行健，君子以自强不息。',
    },
  ],
};

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(sourceRoot, relativePath), 'utf8'));
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function cleanLines(lines) {
  return Array.isArray(lines)
    ? lines.map((line) => line.trim()).filter(Boolean)
    : [];
}

function chapterWorks(items, source, book) {
  return items.map((item, index) => ({
    id: `${source}-${String(index + 1).padStart(3, '0')}`,
    source,
    book,
    title: item.chapter,
    chapter: item.chapter,
    lines: cleanLines(item.paragraphs),
    display: `《${book}·${item.chapter}》`,
  }));
}

function countHanCharacters(value) {
  return (value.match(/\p{Script=Han}/gu) ?? []).length;
}

function classicalSentenceLines(text) {
  const compact = text
    .replace(/\r/gu, '')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replaceAll('¶', '')
        .replace(/<pb:[^>]+>/gu, ''),
    )
    .filter(
      (line) =>
        line &&
        !line.startsWith('#') &&
        !line.startsWith('<pb:') &&
        !line.startsWith('** ') &&
        !/^[ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻ]+(?:（[^）]+）)?$/u.test(line),
    )
    .join('');

  return (compact.match(/[^。！？；]+[。！？；]?/gu) ?? [])
    .map((line) => line.trim())
    .filter((line) => countHanCharacters(line) > 0);
}

function buildZhouyiWorks(items) {
  if (!Array.isArray(items) || items.length !== 69) {
    throw new Error(
      `周易来源数量异常：期望 69，实际 ${Array.isArray(items) ? items.length : '非数组'}`,
    );
  }

  const duplicatedTunMarker = /\n\s*03[.．]\s*屯（卦三）/u;
  const duplicateContainers = items.filter(({ content }) =>
    duplicatedTunMarker.test(content),
  );
  if (duplicateContainers.length !== 1) {
    throw new Error(
      `周易来源中的重复屯卦容器异常：期望 1，实际 ${duplicateContainers.length}`,
    );
  }

  const appendixOrder = new Map([
    ['系辞上', 65],
    ['系辞下', 66],
    ['说卦', 67],
    ['序卦', 68],
    ['杂卦', 69],
  ]);
  const normalized = items.map((item) => {
    const hexagramNumber = Number(item.chapter.match(/^(\d+)/u)?.[1]);
    const order = Number.isInteger(hexagramNumber)
      ? hexagramNumber
      : appendixOrder.get(item.chapter);
    if (!order) {
      throw new Error(`周易篇目无法排序：${item.chapter}`);
    }

    const content =
      hexagramNumber === 2
        ? item.content.replace(/\n\s*03[.．]\s*屯（卦三）[\s\S]*$/u, '')
        : item.content;
    const title = item.chapter
      .replace(/^\d+[.．]\s*/u, '')
      .replace(/（卦[一二三四五六七八九十]+）$/u, '');

    return {
      order,
      source: 'zhouyi',
      book: '周易',
      title,
      author: '佚名',
      chapter: item.chapter,
      lines: classicalSentenceLines(content),
      display: `《周易·${title}》`,
    };
  });

  const orders = normalized.map(({ order }) => order).sort((a, b) => a - b);
  const expectedOrders = Array.from({ length: 69 }, (_, index) => index + 1);
  if (orders.join(',') !== expectedOrders.join(',')) {
    throw new Error('周易来源未形成 64 卦与 5 篇易传的完整唯一序列');
  }

  return normalized
    .sort((left, right) => left.order - right.order)
    .map(({ order, ...work }, index) => ({
      id: `zhouyi-${String(index + 1).padStart(3, '0')}`,
      ...work,
    }));
}

async function buildZhuangziWorks(root) {
  const fileNames = (await readdir(root))
    .filter((fileName) => /^KR5c0126_\d{3}\.txt$/u.test(fileName))
    .sort();
  if (fileNames.length !== 33) {
    throw new Error(`庄子来源数量异常：期望 33，实际 ${fileNames.length}`);
  }

  return Promise.all(
    fileNames.map(async (fileName, index) => {
      const text = await readFile(path.join(root, fileName), 'utf8');
      const title = text.match(
        /^\*\*\s+\d+\s+(.+?)第[一二三四五六七八九十百]+\s*$/mu,
      )?.[1];
      const lines = classicalSentenceLines(text);
      if (!title || lines.length === 0) {
        throw new Error(`庄子来源缺少篇名或正文：${fileName}`);
      }

      return {
        id: `zhuangzi-${String(index + 1).padStart(3, '0')}`,
        source: 'zhuangzi',
        book: '庄子',
        title,
        author: '庄周及后学',
        chapter: `${index + 1}. ${title}`,
        lines,
        display: `《庄子·${title}》`,
      };
    }),
  );
}

const [
  shijingSource,
  chuciSource,
  lunyuSource,
  mengziSource,
  tangSource,
  songciSource,
  zhouyiSource,
  zhuangziWorks,
] =
  await Promise.all([
    readJson(path.join('诗经', 'shijing.json')),
    readJson(path.join('楚辞', 'chuci.json')),
    readJson(path.join('论语', 'lunyu.json')),
    readJson(path.join('四书五经', 'mengzi.json')),
    readJson(path.join('水墨唐诗', 'shuimotangshi.json')),
    readJson(path.join('宋词', '宋词三百首.json')),
    readJsonFile(zhouyiSourcePath),
    buildZhuangziWorks(zhuangziSourceRoot),
  ]);

const libraries = {
  shijing: shijingSource.map((item, index) => ({
    id: `shijing-${String(index + 1).padStart(3, '0')}`,
    source: 'shijing',
    book: '诗经',
    title: item.title,
    author: '佚名',
    chapter: [item.chapter, item.section].filter(Boolean).join('·'),
    lines: cleanLines(item.content),
    display: `《${['诗经', item.chapter, item.section, item.title].filter(Boolean).join('·')}》`,
  })),
  chuci: chuciSource.map((item, index) => ({
    id: `chuci-${String(index + 1).padStart(3, '0')}`,
    source: 'chuci',
    book: '楚辞',
    title: item.title,
    author: item.author || undefined,
    chapter:
      item.section && item.section !== item.title ? item.section : undefined,
    lines: cleanLines(item.content),
    display: `《${['楚辞', item.section !== item.title ? item.section : '', item.title].filter(Boolean).join('·')}》`,
  })),
  lunyu: chapterWorks(lunyuSource, 'lunyu', '论语'),
  mengzi: chapterWorks(mengziSource, 'mengzi', '孟子'),
  zhouyi: buildZhouyiWorks(zhouyiSource),
  zhuangzi: zhuangziWorks,
  tang: tangSource.map((item, index) => ({
    id: `tang-${String(index + 1).padStart(3, '0')}`,
    source: 'tang',
    book: '唐诗',
    title: item.title,
    author: item.author || undefined,
    lines: cleanLines(item.paragraphs),
    display: `唐·${item.author || '佚名'}《${item.title}》`,
  })),
  songci: songciSource.map((item, index) => ({
    id: `songci-${String(index + 1).padStart(3, '0')}`,
    source: 'songci',
    book: '宋词',
    title: item.rhythmic,
    author: item.author || undefined,
    lines: cleanLines(item.paragraphs),
    display: `宋·${item.author || '佚名'}《${item.rhythmic}》`,
  })),
};

const expectedCounts = {
  shijing: 305,
  chuci: 65,
  lunyu: 20,
  mengzi: 14,
  zhouyi: 69,
  zhuangzi: 33,
  tang: 176,
  songci: 280,
};
for (const [source, expectedCount] of Object.entries(expectedCounts)) {
  const works = libraries[source];
  if (works.length !== expectedCount) {
    throw new Error(`${source} 数量异常：期望 ${expectedCount}，实际 ${works.length}`);
  }
  if (
    works.some(
      (work) => !work.title || !work.display || work.lines.length === 0,
    )
  ) {
    throw new Error(`${source} 存在缺少篇名、展示名或正文的记录`);
  }
}

const expectedHanCounts = { zhouyi: 23230, zhuangzi: 65255 };
for (const [source, expectedCount] of Object.entries(expectedHanCounts)) {
  const actualCount = libraries[source].reduce(
    (total, work) =>
      total + work.lines.reduce((sum, line) => sum + countHanCharacters(line), 0),
    0,
  );
  if (actualCount !== expectedCount) {
    throw new Error(
      `${source} 正文指纹异常：期望 ${expectedCount} 个汉字，实际 ${actualCount}`,
    );
  }
}

const zhouyiAppendices = libraries.zhouyi.slice(-5).map(({ title }) => title);
if (zhouyiAppendices.join(',') !== '系辞上,系辞下,说卦,序卦,杂卦') {
  throw new Error(`周易易传顺序异常：${zhouyiAppendices.join(',')}`);
}

const requiredPassages = [
  ['zhouyi', '乾', '天行健，君子以自强不息'],
  ['zhouyi', '坤', '地势坤。君子以厚德载物'],
  ['zhuangzi', '逍遙遊', '北冥有魚'],
  ['zhuangzi', '天下', '天下之治方術者多矣'],
];
for (const [source, title, passage] of requiredPassages) {
  const work = libraries[source].find((item) => item.title === title);
  if (!work?.lines.join('').includes(passage)) {
    throw new Error(`${source} 缺少固定版本锚点：${title}「${passage}」`);
  }
}

const packageRoots = {
  shijing: 'core',
  chuci: 'core',
  lunyu: 'core',
  mengzi: 'core',
  zhouyi: 'core',
  zhuangzi: 'core',
  tang: 'tang',
  songci: 'song',
};
for (const [source, works] of Object.entries(libraries)) {
  const packageRoot = path.join(outputRoot, packageRoots[source]);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    path.join(packageRoot, `${source}.json`),
    `${JSON.stringify(works, null, 2)}\n`,
    'utf8',
  );
}

const index = {
  schemaVersion: 2,
  imageryRegistry: {
    path: 'manual-imagery.json',
    entryCount: MANUAL_IMAGERY_REGISTRY.entries.length,
    reviewedAt: MANUAL_IMAGERY_REGISTRY.reviewedAt,
  },
  source: {
    project: 'chinese-poetry/chinese-poetry',
    repository: 'https://github.com/chinese-poetry/chinese-poetry',
    commit: CHINESE_POETRY_COMMIT,
    license: 'MIT',
  },
  supplementalSources: [
    {
      source: 'zhouyi',
      project: 'gujilab/chinese-classical-corpus',
      repository: 'https://github.com/gujilab/chinese-classical-corpus',
      commit: ZHOUYI_COMMIT,
      license: 'CC0-1.0',
      input: 'output/wujing/zhouyi.json',
    },
    {
      source: 'zhuangzi',
      project: 'kanripo/KR5c0126',
      repository: 'https://github.com/kanripo/KR5c0126',
      commit: ZHUANGZI_COMMIT,
      license: 'CC-BY-SA-4.0',
      input: 'KR5c0126_001.txt ... KR5c0126_033.txt',
    },
  ],
  packages: [
    ...Object.entries(libraries).map(([source, works]) => ({
      source,
      path: `${packageRoots[source]}/${source}.json`,
      workCount: works.length,
      available: true,
      load: 'on-demand',
    })),
  ],
};

await writeFile(
  path.join(outputRoot, 'index.json'),
  `${JSON.stringify(index, null, 2)}\n`,
  'utf8',
);

await writeFile(
  path.join(outputRoot, 'manual-imagery.json'),
  `${JSON.stringify(MANUAL_IMAGERY_REGISTRY, null, 2)}\n`,
  'utf8',
);

console.log(
  `已生成 ${Object.keys(libraries).length} 个核心典籍分包：${outputRoot}`,
);
