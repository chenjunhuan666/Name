import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = process.argv[2];
const outputPath = process.argv[3] ?? 'public/data/characters/basic.json';
const pronunciationOutputPath =
  process.argv[4] ?? 'public/data/characters/pronunciations.json';

if (!sourcePath) {
  throw new Error(
    '请提供 ai-chinese-naming/src-tauri/data/dict.json 的本地路径',
  );
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));

if (!Array.isArray(source.characters)) {
  throw new Error('来源字典格式错误：缺少 characters 数组');
}

const allowedElements = new Set(['木', '火', '土', '金', '水']);
const allowedTones = new Set([1, 2, 3, 4]);

const characters = source.characters
  .filter(
    (item) =>
      typeof item.char === 'string' &&
      [...item.char].length === 1 &&
      allowedElements.has(item.wuxing) &&
      allowedTones.has(item.toneLevel) &&
      item.sentiment === 'positive' &&
      Number.isInteger(item.rarityLevel) &&
      item.rarityLevel <= 2 &&
      item.namingUsage >= 40 &&
      typeof item.meaningBrief === 'string' &&
      item.meaningBrief.trim().length > 0 &&
      Array.isArray(item.styleTags) &&
      item.styleTags.length > 0,
  )
  .sort(
    (left, right) =>
      right.namingUsage - left.namingUsage ||
      left.rarityLevel - right.rarityLevel ||
      left.char.localeCompare(right.char, 'zh-CN'),
  )
  .map((item) => ({
    char: item.char,
    pinyin: item.pinyin,
    tone: item.toneLevel,
    element: item.wuxing,
    elementConfidence: 0.7,
    elementBasis: ['开源字典五行分类（cnchar 数据）'],
    radical: item.radical || undefined,
    strokes: item.strokeCount || undefined,
    meaning: item.meaningBrief.trim(),
    gender:
      item.genderBias >= 0.25
        ? 'male'
        : item.genderBias <= -0.25
          ? 'female'
          : 'neutral',
    rarity: item.rarityLevel / 4,
    styleTags: [...new Set(item.styleTags)],
    negative: false,
  }));

const pronunciations = source.characters
  .filter(
    (item) =>
      typeof item.char === 'string' &&
      [...item.char].length === 1 &&
      typeof item.pinyin === 'string' &&
      item.pinyin.trim().length > 0 &&
      allowedTones.has(item.toneLevel),
  )
  .map((item) => ({
    char: item.char,
    pinyin: item.pinyin,
    tone: item.toneLevel,
    strokes: item.strokeCount || undefined,
  }));

if (characters.length < 1000 || characters.length > 3000) {
  throw new Error(
    `筛选结果 ${characters.length} 字，不符合 Phase 5 的 1000～3000 字范围`,
  );
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(characters, null, 2)}\n`, 'utf8');
await mkdir(path.dirname(pronunciationOutputPath), { recursive: true });
await writeFile(
  pronunciationOutputPath,
  `${JSON.stringify(pronunciations, null, 2)}\n`,
  'utf8',
);

console.log(`已生成 ${characters.length} 个起名汉字：${outputPath}`);
console.log(
  `已生成 ${pronunciations.length} 个单字读音：${pronunciationOutputPath}`,
);
