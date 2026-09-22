import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'docs', 'naming-benchmark');
const checkOnly = process.argv.includes('--check');
const frozenAt = '2026-09-22T00:00:00.000Z';
const allowedClasses = new Set(['excellent', 'good', 'acceptable', 'poor', 'reject']);

async function readJson(relativePath) {
  const raw = await readFile(path.join(directory, relativePath), 'utf8');
  return { value: JSON.parse(raw), raw };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function collectEntries(document, label) {
  const entries = document.recommendations ?? document.entries;
  if (!Array.isArray(entries) || entries.length !== 60) {
    throw new Error(`${label} 必须恰好包含 60 条审查`);
  }
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  if (byId.size !== 60) throw new Error(`${label} 存在重复 ID`);
  return byId;
}

const [
  { value: queue },
  { value: reviewA },
  { value: reviewB },
  { value: finalReview, raw: finalRaw },
  ...v1Datasets
] = await Promise.all([
  readJson('benchmark-v2.holdout.review-queue.json'),
  readJson('reports/review-v2-holdout-a.ai-advisory.json'),
  readJson('reports/review-v2-holdout-b.ai-advisory.json'),
  readJson('reports/review-v2-holdout-final.ai-advisory.json'),
  readJson('benchmark-v1.train.json'),
  readJson('benchmark-v1.validation.json'),
  readJson('benchmark-v1.holdout.json'),
]);

if (queue.status !== 'source-queue-frozen' || queue.candidates?.length !== 60) {
  throw new Error('Phase 4 独立留出集来源包无效');
}
if (finalReview.status !== 'ai-advisory-only' || finalReview.nonHuman !== true) {
  throw new Error('终审文件必须明确标记为非人工 AI 建议');
}

const aById = collectEntries(reviewA, 'A 包审查');
const bById = collectEntries(reviewB, 'B 包审查');
const finalById = collectEntries(finalReview, '终审');
const scenarioIds = new Set(queue.scenarios.map(({ id }) => id));
const classified = new Map(queue.scenarios.map(({ id }) => [id, []]));
const v1FullNames = new Set();
const v1LeakageGroups = new Set();

for (const { value: dataset } of v1Datasets) {
  for (const scenario of dataset.scenarios) {
    for (const candidate of scenario.candidates) {
      v1FullNames.add(`${scenario.surname}${candidate.givenName}`.normalize('NFC'));
      v1LeakageGroups.add(candidate.leakageGroupId);
    }
  }
}

for (const candidate of queue.candidates) {
  const reviewAEntry = aById.get(candidate.id);
  const reviewBEntry = bById.get(candidate.id);
  const final = finalById.get(candidate.id);
  const fullName = candidate.surname + candidate.givenName;
  if (!reviewAEntry || !reviewBEntry || !final ||
      final.name !== fullName || final.scenarioId !== candidate.scenarioId ||
      !scenarioIds.has(candidate.scenarioId)) {
    throw new Error(`审查条目缺失或身份不匹配：${candidate.id}`);
  }
  if (!allowedClasses.has(final.proposedClass) || !final.reason?.trim()) {
    throw new Error(`终审类别或理由无效：${candidate.id}`);
  }
  if (![true, false, null].includes(final.proposedHardFilter)) {
    throw new Error(`终审 hard-filter 状态无效：${candidate.id}`);
  }
  const factGap = final.uncertainty?.factGap ?? final.factGap ?? null;
  if (final.proposedHardFilter === null && !factGap?.trim()) {
    throw new Error(`未决 hard-filter 缺少事实缺口：${candidate.id}`);
  }
  if (final.proposedClass === 'reject' && final.proposedHardFilter !== true) {
    throw new Error(`reject 必须有明确硬风险：${candidate.id}`);
  }
  const tags = [...new Set([
    ...(reviewAEntry.tags ?? []),
    ...(reviewBEntry.tags ?? []),
    ...(final.tags ?? []),
  ].filter((tag) => typeof tag === 'string' && tag.trim()))];
  if (tags.length === 0) throw new Error(`审查缺少质量标签：${candidate.id}`);
  if (v1FullNames.has(fullName.normalize('NFC')) ||
      v1LeakageGroups.has(candidate.leakageGroupId)) {
    throw new Error(`新留出集与 V1 数据泄漏：${candidate.id}`);
  }
  classified.get(candidate.scenarioId).push({
    givenName: candidate.givenName,
    expectedClass: final.proposedClass,
    tags,
    reasons: [final.reason],
    shouldPassHardFilter: final.proposedHardFilter !== true,
    reviewProtocol: 'ai-only-v2',
    sourceCandidateId: candidate.id,
    reviewerIds: ['ai-review-v2-a', 'ai-review-v2-b'],
    adjudicated: true,
    adjudicatedBy: 'ai-review-v2-final',
    hardFilterEvidence: final.proposedHardFilter === true
      ? 'explicit-risk'
      : final.proposedHardFilter === null
        ? 'conservative-no-clear-risk'
        : 'ai-reviewed-no-risk',
    ...(final.proposedHardFilter === null ? { factGap } : {}),
    leakageGroupId: candidate.leakageGroupId,
  });
}

if (finalById.size !== queue.candidates.length) {
  throw new Error('终审存在来源包之外的条目');
}
for (const [scenarioId, candidates] of classified) {
  if (candidates.length !== 12) {
    throw new Error(`${scenarioId} 应有 12 条独立留出候选，实际 ${candidates.length}`);
  }
}

const sourceReviewSha256 = sha256(finalRaw);
const dataset = {
  schemaVersion: 1,
  benchmarkVersion: '2.0.0',
  reviewProtocol: 'ai-only-v2',
  sourceReviewSha256,
  split: 'holdout',
  status: 'frozen',
  frozenAt,
  evidenceBoundary: '独立于 V1 train/validation/holdout 的一次性 AI-only 留出集；不等价于人工审美共识、现实姓名安全或登记适用性。',
  scenarios: queue.scenarios.map((scenario) => ({
    ...scenario,
    benchmarkVersion: '2.0.0',
    candidates: classified.get(scenario.id),
  })),
};

const outputPath = path.join(directory, 'benchmark-v2.holdout.json');
const serialized = `${JSON.stringify(dataset, null, 2)}\n`;
if (checkOnly) {
  if (await readFile(outputPath, 'utf8').catch(() => '') !== serialized) {
    throw new Error('benchmark-v2.holdout.json 与盲审来源不一致');
  }
} else {
  await writeFile(outputPath, serialized, 'utf8');
}
console.log(`Phase 4 独立留出集${checkOnly ? '校验' : '冻结'}完成：60 条；来源 SHA-256 ${sourceReviewSha256}`);
