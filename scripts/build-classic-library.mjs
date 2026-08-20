import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = process.argv[2];
const outputPath = process.argv[3] ?? 'public/data/classics/basic.json';

if (!sourceRoot) {
  throw new Error('请提供 chinese-poetry 仓库的本地根路径');
}

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(path.join(sourceRoot, relativePath), 'utf8'),
  );
}

function cleanLines(lines) {
  return Array.isArray(lines)
    ? lines.map((line) => line.trim()).filter(Boolean)
    : [];
}

const [shijing, chuci, tangPoems, songLyrics] = await Promise.all([
  readJson(path.join('诗经', 'shijing.json')),
  readJson(path.join('楚辞', 'chuci.json')),
  readJson(path.join('水墨唐诗', 'shuimotangshi.json')),
  readJson(path.join('宋词', '宋词三百首.json')),
]);

const works = [
  ...shijing.map((item, index) => ({
    id: `shijing-${String(index + 1).padStart(3, '0')}`,
    source: 'shijing',
    book: '诗经',
    title: item.title,
    author: '佚名',
    chapter: [item.chapter, item.section].filter(Boolean).join('·'),
    lines: cleanLines(item.content),
    display: `《${['诗经', item.chapter, item.section, item.title].filter(Boolean).join('·')}》`,
  })),
  ...chuci.map((item, index) => ({
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
  ...tangPoems.map((item, index) => ({
    id: `tang-${String(index + 1).padStart(3, '0')}`,
    source: 'tang',
    book: '唐诗',
    title: item.title,
    author: item.author || undefined,
    lines: cleanLines(item.paragraphs),
    display: `唐·${item.author || '佚名'}《${item.title}》`,
  })),
  ...songLyrics.map((item, index) => ({
    id: `songci-${String(index + 1).padStart(3, '0')}`,
    source: 'songci',
    book: '宋词',
    title: item.rhythmic,
    author: item.author || undefined,
    lines: cleanLines(item.paragraphs),
    display: `宋·${item.author || '佚名'}《${item.rhythmic}》`,
  })),
];

const expectedCounts = {
  shijing: 305,
  chuci: 65,
  tang: 176,
  songci: 280,
};

Object.entries(expectedCounts).forEach(([source, expectedCount]) => {
  const actualCount = works.filter((work) => work.source === source).length;
  if (actualCount !== expectedCount) {
    throw new Error(`${source} 数据数量异常：期望 ${expectedCount}，实际 ${actualCount}`);
  }
});

if (
  works.some(
    (work) =>
      !work.title ||
      !work.display ||
      !Array.isArray(work.lines) ||
      work.lines.length === 0,
  )
) {
  throw new Error('典籍数据存在缺少篇名、引用名称或正文的记录');
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(works, null, 2)}\n`, 'utf8');

console.log(`已生成 ${works.length} 篇基础典籍语料：${outputPath}`);
Object.entries(expectedCounts).forEach(([source, count]) => {
  console.log(`${source}: ${count}`);
});
