import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const sourceDictionaryPath = process.argv[2];
const standardPath =
  process.argv[3] ?? 'public/data/characters/standard.json';
const recommendedPath =
  process.argv[4] ?? 'public/data/characters/recommended-v2.json';
const outputPath =
  process.argv[5] ?? 'docs/recommended-character-review.json';

if (!sourceDictionaryPath) {
  throw new Error('请提供 ai-chinese-naming/src-tauri/data/dict.json');
}

const SOURCE_COMMIT = '57302376e92bdb7e60f344d2e4a179ba57ca2c7e';
const SOURCE_SHA256 =
  '2a3150ac04c1641388424684364145e0d01781baf8db3e8018e1ca22b39bce69';
const allowedElements = new Set(['木', '火', '土', '金', '水']);
const allowedTones = new Set([1, 2, 3, 4]);
const meaningRiskPattern =
  /病|死|亡|毒|恶|罪|辜|忧|暗|孤|凶|残|灾|祸|哭|尸|杀|刑|贫|苦|败|逃|谍|刺探|祭奠|脆弱|昏暗/u;

const [sourceDictionaryText, standardText, recommendedText] = await Promise.all(
  [sourceDictionaryPath, standardPath, recommendedPath].map((filePath) =>
    readFile(filePath, 'utf8'),
  ),
);
const actualSourceSha256 = createHash('sha256')
  .update(sourceDictionaryText)
  .digest('hex');
if (actualSourceSha256 !== SOURCE_SHA256) {
  throw new Error(
    `ai-chinese-naming 字典版本异常：期望 SHA-256 ${SOURCE_SHA256}，实际 ${actualSourceSha256}`,
  );
}

const sourceDictionary = JSON.parse(sourceDictionaryText);
const standardLibrary = JSON.parse(standardText);
const recommendedCharacters = JSON.parse(recommendedText);

if (!Array.isArray(sourceDictionary.characters)) {
  throw new Error('ai-chinese-naming 字典格式错误：缺少 characters 数组');
}
if (!Array.isArray(standardLibrary.entries)) {
  throw new Error('规范字库格式错误：缺少 entries 数组');
}
if (!Array.isArray(recommendedCharacters)) {
  throw new Error('推荐字库格式错误：期望数组');
}

const standardByCharacter = new Map(
  standardLibrary.entries.map((entry) => [entry.char, entry]),
);
const existingCharacters = new Set(
  recommendedCharacters.map(({ char }) => char),
);
const enabledCount = recommendedCharacters.filter(
  ({ naming }) => naming.suitable,
).length;

const entries = sourceDictionary.characters
  .filter((item) => {
    const standard = standardByCharacter.get(item.char);
    return (
      standard &&
      !existingCharacters.has(item.char) &&
      allowedElements.has(item.wuxing) &&
      allowedTones.has(item.toneLevel) &&
      Number.isInteger(item.rarityLevel) &&
      item.rarityLevel <= 2 &&
      item.namingUsage >= 30 &&
      (item.sentiment === 'positive' || item.sentiment === 'neutral') &&
      typeof item.meaningBrief === 'string' &&
      item.meaningBrief.trim().length > 0 &&
      Array.isArray(item.styleTags) &&
      item.styleTags.length > 0
    );
  })
  .map((item) => {
    const standard = standardByCharacter.get(item.char);
    const riskFlags = [
      ...(item.sentiment === 'neutral' ? ['neutral-sentiment'] : []),
      ...(item.namingUsage < 40
        ? ['below-production-usage-threshold']
        : []),
      ...(meaningRiskPattern.test(item.meaningBrief)
        ? ['meaning-risk-keyword']
        : []),
    ];

    return {
      char: item.char,
      decision: 'pending',
      reviewNote: '',
      source: {
        sentiment: item.sentiment,
        namingUsage: item.namingUsage,
        rarityLevel: item.rarityLevel,
        meaning: item.meaningBrief.trim(),
        styleTags: [...new Set(item.styleTags)],
      },
      facts: {
        pinyin: item.pinyin,
        tone: item.toneLevel,
        element: item.wuxing,
        radical: item.radical || undefined,
        strokes: item.strokeCount || undefined,
        standardIndex: standard.index,
        standardLevel: standard.level,
      },
      riskFlags,
    };
  })
  .sort(
    (left, right) =>
      Number(left.source.sentiment === 'neutral') -
        Number(right.source.sentiment === 'neutral') ||
      left.riskFlags.length - right.riskFlags.length ||
      right.source.namingUsage - left.source.namingUsage ||
      left.source.rarityLevel - right.source.rarityLevel ||
      left.facts.standardIndex - right.facts.standardIndex,
  );

const counts = {
  currentEnabled: enabledCount,
  pending: entries.length,
  positiveBelowThreshold: entries.filter(
    ({ source }) => source.sentiment === 'positive',
  ).length,
  neutral: entries.filter(({ source }) => source.sentiment === 'neutral').length,
  meaningRiskFlagged: entries.filter(({ riskFlags }) =>
    riskFlags.includes('meaning-risk-keyword'),
  ).length,
  projectedIfAllApproved: enabledCount + entries.length,
};

if (
  counts.currentEnabled !== 1433 ||
  counts.pending !== 1071 ||
  counts.positiveBelowThreshold !== 83 ||
  counts.neutral !== 988 ||
  counts.projectedIfAllApproved !== 2504
) {
  throw new Error(`审校队列固定版本计数异常：${JSON.stringify(counts)}`);
}

const reviewQueue = {
  schemaVersion: 1,
  source: {
    project: 'cicbyte/ai-chinese-naming',
    repository: 'https://github.com/cicbyte/ai-chinese-naming',
    commit: SOURCE_COMMIT,
    dictionarySha256: SOURCE_SHA256,
    license: 'MIT',
    input: 'src-tauri/data/dict.json',
  },
  policy: {
    targetEnabledRange: [2500, 4000],
    currentProductionRule:
      'positive sentiment, namingUsage >= 40, rarityLevel <= 2, complete required fields',
    queueRule:
      'not already recommended, general-standard character, positive or neutral sentiment, namingUsage >= 30, rarityLevel <= 2, complete required fields',
    activationRule:
      'pending and rejected entries must never enter the runtime recommendation library; only explicitly reviewed approved entries may be imported later',
  },
  counts,
  entries,
};

await writeFile(outputPath, `${JSON.stringify(reviewQueue, null, 2)}\n`, 'utf8');
console.log(
  `已生成 ${entries.length} 字审校队列（正向低阈值 ${counts.positiveBelowThreshold}、中性 ${counts.neutral}、风险词 ${counts.meaningRiskFlagged}）：${outputPath}`,
);
