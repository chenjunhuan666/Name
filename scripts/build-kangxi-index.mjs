import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = process.argv[2];
const outputPath =
  process.argv[3] ?? 'public/data/characters/kangxi-index.json';

if (!sourceRoot) {
  throw new Error('请提供 skills-baby-name/references/kangxi 目录');
}

function parseTsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split('\t');
  return lines.filter(Boolean).map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

const [indexText, aliasesText] = await Promise.all([
  readFile(path.join(sourceRoot, 'index.tsv'), 'utf8'),
  readFile(path.join(sourceRoot, 'aliases.tsv'), 'utf8'),
]);
const indexRows = parseTsv(indexText);
const aliasRows = parseTsv(aliasesText);

const entries = indexRows.map((row) => ({
  char: row['字'],
  radical: row['部首'],
  page: Number(row['页']),
  position: row['位'],
  volume: row['文件'],
  line: Number(row['行号']),
}));
const aliases = aliasRows.map((row) => ({
  query: row['查询字'],
  canonical: row['实际收录字'],
  note: row['说明'],
}));

if (
  entries.some(
    ({ char, radical, page, volume, line }) =>
      !char || !radical || !Number.isInteger(page) || !volume || !Number.isInteger(line),
  )
) {
  throw new Error('康熙索引存在不完整记录');
}

const output = {
  schemaVersion: 1,
  source: {
    project: 'amliuyong/skills-baby-name',
    repository: 'https://github.com/amliuyong/skills-baby-name',
    commit: 'd10427c34ff756143fdacf96960d5c40cee73ceb',
    license: 'MIT (declared in README)',
    sourcePaths: [
      'references/kangxi/index.tsv',
      'references/kangxi/aliases.tsv',
    ],
  },
  entries,
  aliases,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(
  `已生成 ${entries.length} 条康熙字头索引和 ${aliases.length} 条异体映射：${outputPath}`,
);
