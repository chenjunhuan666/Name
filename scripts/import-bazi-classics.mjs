import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const sourceArgument = process.argv[2];

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (!sourceArgument) {
  throw new Error(
    '请提供 FOR-BAZI 仓库根目录或 data/classical_texts 目录',
  );
}

const outputRoot = optionValue('--output') ?? 'public/data/bazi/classical';
const suppliedCommit = optionValue('--commit');
const sourceRoot = path.resolve(sourceArgument);
const classicalRoot = sourceRoot.endsWith('classical_texts')
  ? sourceRoot
  : path.join(sourceRoot, 'data', 'classical_texts');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function resolveCommit() {
  if (suppliedCommit) {
    return suppliedCommit;
  }

  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      sourceRoot,
      'rev-parse',
      'HEAD',
    ]);
    return stdout.trim();
  } catch {
    throw new Error(
      '无法从来源目录读取 Git commit；使用 --commit <hash> 显式固定来源版本',
    );
  }
}

function normalizeEntry(entryId, rawEntry) {
  if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
    throw new Error(`条目 ${entryId} 不是对象`);
  }

  const knownKeys = new Set([
    'category',
    'key',
    '原文',
    '全文',
    '解析',
    '出处',
    'tags',
  ]);
  const attributes = Object.fromEntries(
    Object.entries(rawEntry).filter(([key]) => !knownKeys.has(key)),
  );

  return {
    id: entryId,
    category:
      typeof rawEntry.category === 'string' ? rawEntry.category : '未分类',
    subject: typeof rawEntry.key === 'string' ? rawEntry.key : entryId,
    quotation: typeof rawEntry.原文 === 'string' ? rawEntry.原文 : undefined,
    fullText: typeof rawEntry.全文 === 'string' ? rawEntry.全文 : undefined,
    explanation: typeof rawEntry.解析 === 'string' ? rawEntry.解析 : undefined,
    citation: typeof rawEntry.出处 === 'string' ? rawEntry.出处 : undefined,
    tags: Array.isArray(rawEntry.tags)
      ? rawEntry.tags.filter((tag) => typeof tag === 'string')
      : [],
    attributes,
  };
}

const index = await readJson(path.join(classicalRoot, 'index.json'));
const commit = await resolveCommit();

if (!Array.isArray(index.texts) || index.texts.length !== 5) {
  throw new Error('来源 index.json 必须登记五本核心典籍');
}

const works = [];
await mkdir(outputRoot, { recursive: true });

for (const work of index.texts) {
  if (
    typeof work.id !== 'string' ||
    typeof work.name !== 'string' ||
    typeof work.file !== 'string'
  ) {
    throw new Error('index.json 存在缺少 id、name 或 file 的典籍');
  }

  const source = await readJson(path.join(classicalRoot, work.file));
  if (!source.entries || typeof source.entries !== 'object') {
    throw new Error(`${work.file} 缺少 entries 对象`);
  }

  const entries = Object.entries(source.entries).map(([entryId, entry]) =>
    normalizeEntry(entryId, entry),
  );
  const declaredCount = source.metadata?.total_entries;
  if (Number.isInteger(declaredCount) && declaredCount !== entries.length) {
    throw new Error(
      `${work.file} 声明 ${declaredCount} 条，实际 ${entries.length} 条`,
    );
  }

  const fileName = `${work.id.replaceAll('_', '-')}.json`;
  const normalizedWork = {
    schemaVersion: 1,
    id: work.id,
    title: work.name,
    author: work.author,
    dynasty: work.dynasty,
    description: work.description,
    categories: work.categories ?? [],
    sourceVersion: source.version,
    sourceLastUpdated: source.last_updated,
    entries,
  };

  await writeFile(
    path.join(outputRoot, fileName),
    `${JSON.stringify(normalizedWork, null, 2)}\n`,
    'utf8',
  );

  works.push({
    id: work.id,
    title: work.name,
    file: fileName,
    entryCount: entries.length,
    categories: work.categories ?? [],
  });
}

const outputIndex = {
  schemaVersion: 1,
  source: {
    project: 'gaaiyun/FOR-BAZI',
    repository: 'https://github.com/gaaiyun/FOR-BAZI',
    commit,
    license: 'MIT',
    sourcePath: 'data/classical_texts',
  },
  sourceVersion: index.version,
  sourceLastUpdated: index.last_updated,
  works,
};

await writeFile(
  path.join(outputRoot, 'index.json'),
  `${JSON.stringify(outputIndex, null, 2)}\n`,
  'utf8',
);

console.log(
  `已导入 ${works.length} 本典籍、${works.reduce((sum, work) => sum + work.entryCount, 0)} 条资料：${outputRoot}`,
);
