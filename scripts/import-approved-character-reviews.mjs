import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyPronunciationCorrection } from './character-pronunciation-corrections.mjs';

const allowedDecisions = new Set(['pending', 'approved', 'rejected']);
const canonicalUtcIsoPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveEntryEligibility(batch) {
  const eligibility = batch.policy?.entryEligibility;
  if (!eligibility) {
    return {
      sentiments: ['positive'],
      namingUsage: { min: 30, maxExclusive: 40 },
    };
  }

  if (
    !Array.isArray(eligibility.sentiments) ||
    eligibility.sentiments.length === 0 ||
    eligibility.sentiments.some((sentiment) => typeof sentiment !== 'string')
  ) {
    throw new Error('审校批次 entryEligibility.sentiments 配置无效');
  }
  if (
    eligibility.namingUsage !== undefined &&
    (typeof eligibility.namingUsage !== 'object' ||
      eligibility.namingUsage === null ||
      (eligibility.namingUsage.min !== undefined &&
        !Number.isInteger(eligibility.namingUsage.min)) ||
      (eligibility.namingUsage.maxExclusive !== undefined &&
        !Number.isInteger(eligibility.namingUsage.maxExclusive)))
  ) {
    throw new Error('审校批次 entryEligibility.namingUsage 配置无效');
  }
  if (
    eligibility.rarityLevel !== undefined &&
    (typeof eligibility.rarityLevel !== 'object' ||
      eligibility.rarityLevel === null ||
      (eligibility.rarityLevel.maxInclusive !== undefined &&
        !Number.isInteger(eligibility.rarityLevel.maxInclusive)))
  ) {
    throw new Error('审校批次 entryEligibility.rarityLevel 配置无效');
  }

  return eligibility;
}

function matchesEntryEligibility(entry, eligibility) {
  const { source } = entry.evidence;
  const usage = eligibility.namingUsage;
  const rarity = eligibility.rarityLevel;

  return (
    eligibility.sentiments.includes(source.sentiment) &&
    (usage?.min === undefined || source.namingUsage >= usage.min) &&
    (usage?.maxExclusive === undefined ||
      source.namingUsage < usage.maxExclusive) &&
    (rarity?.maxInclusive === undefined ||
      source.rarityLevel <= rarity.maxInclusive)
  );
}

export function isCanonicalUtcIsoTimestamp(value) {
  if (typeof value !== 'string' || !canonicalUtcIsoPattern.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  return parsed.toISOString() === normalized;
}

function assertMatchingCounts(batch, counts) {
  for (const [key, value] of Object.entries(counts)) {
    if (batch.counts?.[key] !== value) {
      throw new Error(
        `审校批次计数不一致：counts.${key} 期望 ${value}，实际 ${batch.counts?.[key]}`,
      );
    }
  }
}

export function validateReviewBatch(batch, queueText) {
  const queue = JSON.parse(queueText);
  if (batch?.schemaVersion !== 1 || !Array.isArray(batch.entries)) {
    throw new Error('审校批次格式错误：要求 schemaVersion=1 和 entries 数组');
  }
  if (!Array.isArray(queue.entries)) {
    throw new Error('审校队列格式错误：缺少 entries 数组');
  }
  if (batch.sourceQueue?.sha256 !== sha256(queueText)) {
    throw new Error('审校批次关联的队列 SHA-256 与当前队列文件不一致');
  }
  if (
    batch.sourceQueue.sourceCommit !== queue.source?.commit ||
    batch.sourceQueue.dictionarySha256 !== queue.source?.dictionarySha256
  ) {
    throw new Error('审校批次记录的来源版本与当前队列不一致');
  }

  const queueByCharacter = new Map();
  for (const entry of queue.entries) {
    if (queueByCharacter.has(entry.char)) {
      throw new Error(`审校队列存在重复字符“${entry.char}”`);
    }
    queueByCharacter.set(entry.char, entry);
  }

  const batchCharacters = new Set();
  const entryEligibility = resolveEntryEligibility(batch);
  const approvedEntries = [];
  const counts = {
    total: batch.entries.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const entry of batch.entries) {
    if (typeof entry.char !== 'string' || [...entry.char].length !== 1) {
      throw new Error('审校批次包含无效单字');
    }
    if (batchCharacters.has(entry.char)) {
      throw new Error(`审校批次存在重复字符“${entry.char}”`);
    }
    batchCharacters.add(entry.char);

    const queueEntry = queueByCharacter.get(entry.char);
    if (!queueEntry) {
      throw new Error(`审校队列中不存在批次字符“${entry.char}”`);
    }
    const expectedEvidence = {
      source: queueEntry.source,
      facts: queueEntry.facts,
      riskFlags: queueEntry.riskFlags,
    };
    if (JSON.stringify(entry.evidence) !== JSON.stringify(expectedEvidence)) {
      throw new Error(`字符“${entry.char}”的审校证据与固定队列不一致`);
    }
    if (!matchesEntryEligibility(entry, entryEligibility)) {
      throw new Error(`字符“${entry.char}”不符合审校批次声明的候选范围`);
    }

    const review = entry.review;
    if (!review || !allowedDecisions.has(review.decision)) {
      throw new Error(`字符“${entry.char}”包含不支持的审校决定`);
    }
    counts[review.decision] += 1;

    if (
      review.decision === 'pending' &&
      (review.note !== '' || review.reviewedBy !== '' || review.reviewedAt !== '')
    ) {
      throw new Error(`字符“${entry.char}”仍为 pending，但已填写审校结论字段`);
    }
    if (review.decision === 'approved') {
      if (!isNonEmptyString(review.note)) {
        throw new Error(`字符“${entry.char}”已批准但缺少审校理由`);
      }
      if (!isNonEmptyString(review.approvedMeaning)) {
        throw new Error(`字符“${entry.char}”已批准但缺少人工确认释义`);
      }
      if (!isNonEmptyString(review.reviewedBy)) {
        throw new Error(`字符“${entry.char}”已批准但缺少审校人`);
      }
      if (!isCanonicalUtcIsoTimestamp(review.reviewedAt)) {
        throw new Error(
          `字符“${entry.char}”已批准但 reviewedAt 不是规范 UTC ISO-8601 时间`,
        );
      }
      approvedEntries.push(entry);
    }
  }

  assertMatchingCounts(batch, counts);
  return { approvedEntries, counts };
}

function assertSourceMatchesEvidence(source, entry) {
  const { facts, source: evidence } = entry.evidence;
  const matches =
    source.char === entry.char &&
    source.pinyin === facts.pinyin &&
    source.toneLevel === facts.tone &&
    source.wuxing === facts.element &&
    (source.radical || undefined) === facts.radical &&
    (source.strokeCount || undefined) === facts.strokes &&
    source.sentiment === evidence.sentiment &&
    source.namingUsage === evidence.namingUsage &&
    source.rarityLevel === evidence.rarityLevel &&
    source.meaningBrief.trim() === evidence.meaning &&
    JSON.stringify([...new Set(source.styleTags)]) ===
      JSON.stringify(evidence.styleTags);

  if (!matches) {
    throw new Error(`字符“${entry.char}”的固定来源字典事实与审校证据不一致`);
  }
}

function resolveRuntimeSourceMarkers(batch) {
  const markers = batch.policy?.runtimeSourceMarkers ?? [];
  if (
    !Array.isArray(markers) ||
    markers.some((marker) => !isNonEmptyString(marker)) ||
    new Set(markers).size !== markers.length
  ) {
    throw new Error('审校批次 runtimeSourceMarkers 配置无效');
  }
  return markers;
}

export function prepareApprovedCharacterImport({
  batch,
  queueText,
  sourceDictionaryText,
  standardLibrary,
  kangxi,
  recommendedCharacters,
}) {
  const { approvedEntries, counts } = validateReviewBatch(batch, queueText);
  if (sha256(sourceDictionaryText) !== batch.sourceQueue.dictionarySha256) {
    throw new Error('来源字典 SHA-256 与审校批次固定版本不一致');
  }

  const sourceDictionary = JSON.parse(sourceDictionaryText);
  if (!Array.isArray(sourceDictionary.characters)) {
    throw new Error('来源字典格式错误：缺少 characters 数组');
  }
  if (!Array.isArray(standardLibrary.entries)) {
    throw new Error('规范字库格式错误：缺少 entries 数组');
  }
  if (!Array.isArray(kangxi.entries) || !Array.isArray(kangxi.aliases)) {
    throw new Error('康熙索引格式错误：缺少 entries 或 aliases 数组');
  }
  if (!Array.isArray(recommendedCharacters)) {
    throw new Error('推荐字库格式错误：期望数组');
  }

  const sourceByCharacter = new Map(
    sourceDictionary.characters.map((entry) => [entry.char, entry]),
  );
  const standardByCharacter = new Map(
    standardLibrary.entries.map((entry) => [entry.char, entry]),
  );
  const kangxiByCharacter = new Map(
    kangxi.entries.map((entry) => [entry.char, entry]),
  );
  const aliases = new Map(kangxi.aliases.map((entry) => [entry.query, entry]));
  const existingByCharacter = new Map(
    recommendedCharacters.map((entry) => [entry.char, entry]),
  );
  const reviewMarker = `manual-review:${batch.batchId}`;
  const runtimeSourceMarkers = resolveRuntimeSourceMarkers(batch);
  const additions = [];
  let alreadyImported = 0;

  for (const entry of approvedEntries) {
    const source = sourceByCharacter.get(entry.char);
    if (!source) {
      throw new Error(`固定来源字典缺少已批准字符“${entry.char}”`);
    }
    assertSourceMatchesEvidence(source, entry);

    const standard = standardByCharacter.get(entry.char);
    if (
      !standard ||
      standard.index !== entry.evidence.facts.standardIndex ||
      standard.level !== entry.evidence.facts.standardLevel
    ) {
      throw new Error(`字符“${entry.char}”的规范字索引与审校证据不一致`);
    }

    const alias = aliases.get(entry.char);
    const canonical = alias?.canonical ?? entry.char;
    const kangxiEntry = kangxiByCharacter.get(canonical);
    const candidate = applyPronunciationCorrection({
      char: entry.char,
      pinyin: entry.evidence.facts.pinyin,
      tone: entry.evidence.facts.tone,
      ...(entry.evidence.facts.radical
        ? { radical: entry.evidence.facts.radical }
        : {}),
      ...(entry.evidence.facts.strokes
        ? { strokes: entry.evidence.facts.strokes }
        : {}),
      ...(canonical !== entry.char ? { traditional: canonical } : {}),
      meanings: { modern: entry.review.approvedMeaning.trim() },
      elements: {
        primary: entry.evidence.facts.element,
        confidence: 0.7,
        basis: ['开源字典五行分类（cnchar 数据）'],
        references: ['ai-chinese-naming:dict.json'],
      },
      naming: {
        suitable: true,
        usageScore: entry.evidence.source.namingUsage,
        rarity: entry.evidence.source.rarityLevel / 4,
        gender:
          source.genderBias >= 0.25
            ? 'male'
            : source.genderBias <= -0.25
              ? 'female'
              : 'neutral',
        styleTags: entry.evidence.source.styleTags,
      },
      sources: {
        standard: [
          `general-standard-2013:${String(standard.index).padStart(4, '0')}:level-${standard.level}`,
        ],
        ...(kangxiEntry
          ? {
              dictionary: [
                `kangxi:${canonical}:page-${kangxiEntry.page}:${kangxiEntry.position}`,
              ],
            }
          : {}),
        project: [
          'ai-chinese-naming:dict.json',
          ...runtimeSourceMarkers,
          reviewMarker,
        ],
      },
    });

    const existing = existingByCharacter.get(entry.char);
    if (existing) {
      if (
        existing.sources?.project?.includes(reviewMarker) &&
        JSON.stringify(existing) === JSON.stringify(candidate)
      ) {
        alreadyImported += 1;
        continue;
      }
      throw new Error(`已批准字符“${entry.char}”已存在于推荐层且来源不一致`);
    }

    additions.push(candidate);
  }

  return {
    reviewCounts: counts,
    approvedCount: approvedEntries.length,
    alreadyImported,
    additions,
    merged: [...recommendedCharacters, ...additions],
  };
}

export async function main(args = process.argv.slice(2)) {
  const sourceDictionaryPath = args[0];
  const batchPath =
    args[1] ?? 'docs/recommended-character-review-batch-01.json';
  const queuePath = args[2] ?? 'docs/recommended-character-review.json';
  const standardPath =
    args[3] ?? 'public/data/characters/standard.json';
  const kangxiPath =
    args[4] ?? 'public/data/characters/kangxi-index.json';
  const recommendedPath =
    args[5] ?? 'public/data/characters/recommended-v2.json';

  if (!sourceDictionaryPath) {
    throw new Error('请提供固定版本 ai-chinese-naming/src-tauri/data/dict.json');
  }

  const [
    sourceDictionaryText,
    batchText,
    queueText,
    standardText,
    kangxiText,
    recommendedText,
  ] = await Promise.all(
    [
      sourceDictionaryPath,
      batchPath,
      queuePath,
      standardPath,
      kangxiPath,
      recommendedPath,
    ].map((filePath) => readFile(filePath, 'utf8')),
  );
  const result = prepareApprovedCharacterImport({
    batch: JSON.parse(batchText),
    queueText,
    sourceDictionaryText,
    standardLibrary: JSON.parse(standardText),
    kangxi: JSON.parse(kangxiText),
    recommendedCharacters: JSON.parse(recommendedText),
  });

  if (result.additions.length === 0) {
    console.log(
      `审校批次已通过门禁：approved=${result.approvedCount}，新增=0，推荐字库未写入。`,
    );
    return result;
  }

  await writeFile(
    recommendedPath,
    `${JSON.stringify(result.merged, null, 2)}\n`,
    'utf8',
  );
  console.log(
    `已导入 ${result.additions.length} 个经人工批准的字符：${path.normalize(recommendedPath)}`,
  );
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
