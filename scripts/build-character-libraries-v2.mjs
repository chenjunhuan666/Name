import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyPronunciationCorrection } from './character-pronunciation-corrections.mjs';

const standardPath = process.argv[2];
const independentPath = process.argv[3];
const sourceDictionaryPath = process.argv[4];
const basicPath = process.argv[5] ?? 'public/data/characters/basic.json';
const kangxiPath =
  process.argv[6] ?? 'public/data/characters/kangxi-index.json';
const outputRoot = process.argv[7] ?? 'public/data/characters';

if (!standardPath || !sourceDictionaryPath) {
  throw new Error(
    '请依次提供 8105 字转录文件、独立核验文件和 ai-chinese-naming/dict.json',
  );
}

const TRANSCRIPTION_COMMIT = '6f6538e0ecc780c3e73d1c12ca3c7ba91fee82e1';
const INDEPENDENT_COMMIT = 'ea539bfb164946a7aa71048954ac2bd4833098e7';
const expectedCounts = [3500, 3000, 1605];

function parseCharacterLines(text) {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseIndexedTranscript(text) {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const columns = line.split(/\s+/);
      const char = columns.length === 1 ? columns[0] : columns[1];
      if ([...char].length !== 1) {
        throw new Error(`规范字转录第 ${index + 1} 行无法解析单个字符`);
      }
      return char;
    });
}

const transcriptCharacters = parseIndexedTranscript(
  await readFile(standardPath, 'utf8'),
);
if (transcriptCharacters.length !== 8105) {
  throw new Error(
    `规范汉字转录数量异常：期望 8105，实际 ${transcriptCharacters.length}`,
  );
}
const levels = [
  transcriptCharacters.slice(0, 3500),
  transcriptCharacters.slice(3500, 6500),
  transcriptCharacters.slice(6500),
];

const allCharacters = levels.flat();
if (new Set(allCharacters).size !== 8105) {
  throw new Error('规范汉字转录必须包含 8105 个不重复字符');
}

if (independentPath) {
  const independentCharacters = parseCharacterLines(
    await readFile(independentPath, 'utf8'),
  );
  if (independentCharacters.join('') !== allCharacters.join('')) {
    throw new Error('两份独立规范汉字转录不一致，停止生成');
  }
}

const entries = levels.flatMap((characters, levelIndex) =>
  characters.map((char, characterIndex) => ({
    char,
    index:
      expectedCounts
        .slice(0, levelIndex)
        .reduce((total, count) => total + count, 0) +
      characterIndex +
      1,
    level: levelIndex + 1,
  })),
);
const standardByCharacter = new Map(entries.map((entry) => [entry.char, entry]));

const standardLibrary = {
  schemaVersion: 1,
  source: {
    title: '通用规范汉字表',
    publisher: '中华人民共和国教育部、国家语言文字工作委员会',
    publishedAt: '2013-06-05',
    officialPage:
      'https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201306/t20130601_186002.html',
    officialAttachment:
      'https://www.moe.gov.cn/publicfiles/business/htmlfiles/moe/cmsmedia/other/2013/7/other98742.zip',
    transcription: {
      repository:
        'https://github.com/lqfeng/ChineseCharacters',
      commit: TRANSCRIPTION_COMMIT,
      paths: ['通用规范汉字表(2013)全部(8105字).txt'],
    },
    ...(independentPath
      ? {
          independentCheck: {
            repository:
              'https://github.com/jaywcjlove/table-of-general-standard-chinese-characters',
            commit: INDEPENDENT_COMMIT,
            path: 'data/characters.txt',
            result: 'exact-match',
          },
        }
      : {}),
  },
  counts: { total: 8105, level1: 3500, level2: 3000, level3: 1605 },
  entries,
};

const basicCharacters = JSON.parse(await readFile(basicPath, 'utf8'));
const sourceDictionary = JSON.parse(
  await readFile(sourceDictionaryPath, 'utf8'),
);
if (!Array.isArray(sourceDictionary.characters)) {
  throw new Error('ai-chinese-naming 字典格式错误：缺少 characters 数组');
}
const sourceCharacterByChar = new Map(
  sourceDictionary.characters.map((character) => [character.char, character]),
);
const kangxi = JSON.parse(await readFile(kangxiPath, 'utf8'));
const kangxiEntries = new Map(kangxi.entries.map((entry) => [entry.char, entry]));
const aliases = new Map(kangxi.aliases.map((alias) => [alias.query, alias]));

const recommendedCharacters = basicCharacters.map((character) => {
  const standard = standardByCharacter.get(character.char);
  const sourceCharacter = sourceCharacterByChar.get(character.char);
  if (!sourceCharacter) {
    throw new Error(`来源字典缺少推荐字“${character.char}”`);
  }

  const alias = aliases.get(character.char);
  const canonical = alias?.canonical ?? character.char;
  const kangxiEntry = kangxiEntries.get(canonical);
  const primaryElement = Array.isArray(character.element)
    ? character.element[0]
    : character.element;
  const alternatives = Array.isArray(character.element)
    ? character.element.slice(1)
    : [];

  return applyPronunciationCorrection({
    char: character.char,
    pinyin: character.pinyin,
    tone: character.tone,
    radical: character.radical,
    strokes: character.strokes,
    ...(alias && alias.canonical !== character.char
      ? { traditional: alias.canonical }
      : {}),
    traditionalStrokes: character.traditionalStrokes,
    meanings: { modern: character.meaning },
    elements: {
      primary: primaryElement,
      ...(alternatives.length ? { alternatives } : {}),
      confidence: character.elementConfidence,
      basis: character.elementBasis,
      references: ['ai-chinese-naming:dict.json'],
    },
    naming: {
      suitable: !character.negative && Boolean(standard),
      usageScore: sourceCharacter.namingUsage,
      rarity: character.rarity,
      gender: character.gender,
      styleTags: character.styleTags,
    },
    sources: {
      ...(standard
        ? {
            standard: [
              `general-standard-2013:${String(standard.index).padStart(4, '0')}:level-${standard.level}`,
            ],
          }
        : {}),
      ...(kangxiEntry
        ? {
            dictionary: [
              `kangxi:${canonical}:page-${kangxiEntry.page}:${kangxiEntry.position}`,
            ],
          }
        : {}),
      project: ['ai-chinese-naming:dict.json'],
    },
  });
});

await mkdir(outputRoot, { recursive: true });
await Promise.all([
  writeFile(
    path.join(outputRoot, 'standard.json'),
    `${JSON.stringify(standardLibrary, null, 2)}\n`,
    'utf8',
  ),
  writeFile(
    path.join(outputRoot, 'recommended-v2.json'),
    `${JSON.stringify(recommendedCharacters, null, 2)}\n`,
    'utf8',
  ),
]);

const kangxiLinkedCount = recommendedCharacters.filter(
  (character) => character.sources.dictionary?.length,
).length;
const suitableCount = recommendedCharacters.filter(
  (character) => character.naming.suitable,
).length;
console.log(
  `已生成 8105 字标准层与 ${recommendedCharacters.length} 条推荐记录（${suitableCount} 条启用）；${kangxiLinkedCount} 字关联康熙索引。`,
);
