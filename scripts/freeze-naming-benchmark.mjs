import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'docs', 'naming-benchmark');
const checkOnly = process.argv.includes('--check');
const benchmarkVersion = '1.1.0';
const frozenAt = '2026-09-22T00:00:00.000Z';
const splitOrder = ['train', 'validation', 'holdout'];
const perScenarioTargets = { train: 36, validation: 12, holdout: 12 };

async function readJson(relativePath) {
  const raw = await readFile(path.join(directory, relativePath), 'utf8');
  return { value: JSON.parse(raw), raw };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const [{ value: queue }, { value: review, raw: reviewRaw }, { value: first }, { value: second }] =
  await Promise.all([
    readJson('benchmark-v1.review-queue.json'),
    readJson('reports/review-final.ai-advisory.json'),
    readJson('reports/review-a.ai-advisory.json'),
    readJson('reports/review-b.ai-advisory.json'),
  ]);

if (queue.candidates.length !== 300 || review.entries.length !== 300 ||
    review.status !== 'ai-advisory-only' || review.nonHuman !== true) {
  throw new Error('AI 审查来源不是预期的 300 条非人工建议');
}

const byId = new Map(review.entries.map((entry) => [entry.id, entry]));
const firstById = new Map(first.recommendations.map((entry) => [entry.id, entry]));
const secondById = new Map(second.entries.map((entry) => [entry.id, entry]));
if (byId.size !== 300 || firstById.size !== 300 || secondById.size !== 300) {
  throw new Error('AI 审查来源存在重复 ID');
}

const classified = new Map(queue.scenarios.map((scenario) => [scenario.id, []]));
for (const candidate of queue.candidates) {
  const final = byId.get(candidate.id);
  const a = firstById.get(candidate.id);
  const b = secondById.get(candidate.id);
  if (!final || !a || !b || final.name !== candidate.surname + candidate.givenName ||
      final.scenarioId !== candidate.scenarioId || !final.reason?.trim() ||
      !['excellent', 'good', 'acceptable', 'poor', 'reject'].includes(final.proposedClass) ||
      !classified.has(candidate.scenarioId)) {
    throw new Error(`AI 审查来源缺失或不匹配：${candidate.id}`);
  }
  if (final.proposedHardFilter === null && !final.uncertainty?.factGap?.trim()) {
    throw new Error(`未决 hard-filter 缺少事实缺口：${candidate.id}`);
  }
  if (final.proposedClass === 'reject' && final.proposedHardFilter !== true) {
    throw new Error(`reject 缺少明确硬风险证据：${candidate.id}`);
  }
  const tags = [...new Set([...a.tags, ...b.tags])].filter(Boolean);
  if (tags.length === 0) {
    throw new Error(`AI 审查缺少质量标签：${candidate.id}`);
  }
  classified.get(candidate.scenarioId).push({
    id: candidate.id,
    scenarioId: candidate.scenarioId,
    judgement: {
      givenName: candidate.givenName,
      expectedClass: final.proposedClass,
      tags,
      reasons: [final.reason],
      // No clear hard-risk evidence is a benchmark policy, not proof of legal or phonetic safety.
      shouldPassHardFilter: final.proposedHardFilter !== true,
      reviewProtocol: 'ai-only-v1',
      sourceCandidateId: candidate.id,
      reviewerIds: ['ai-review-a', 'ai-review-b'],
      adjudicated: true,
      adjudicatedBy: 'ai-review-final',
      hardFilterEvidence: final.proposedHardFilter === true
        ? 'explicit-risk'
        : final.proposedHardFilter === null
          ? 'conservative-no-clear-risk'
          : 'ai-reviewed-no-risk',
      ...(final.proposedHardFilter === null
        ? { factGap: final.uncertainty.factGap }
        : {}),
      leakageGroupId: candidate.leakageGroupId,
    },
  });
}

const assigned = Object.fromEntries(splitOrder.map((split) => [split, new Map()]));
const assignmentIds = new Map();
function assign(item, split) {
  const scenarioItems = assigned[split].get(item.scenarioId) ?? [];
  if (scenarioItems.length >= perScenarioTargets[split]) {
    throw new Error(`${item.scenarioId}/${split} 超出预定规模`);
  }
  scenarioItems.push(item.judgement);
  assigned[split].set(item.scenarioId, scenarioItems);
  assignmentIds.set(item.id, split);
}

// Reserve the only reject for holdout and spread the three excellent examples
// before any V2 scores are observed. Remaining allocation is hash-stable.
for (const item of [...classified.values()].flat().filter(({ judgement }) =>
  judgement.expectedClass === 'reject')) {
  assign(item, 'holdout');
}
const excellent = [...classified.values()].flat()
  .filter(({ judgement }) => judgement.expectedClass === 'excellent')
  .sort((left, right) => left.id.localeCompare(right.id));
excellent.forEach((item, index) => assign(item, splitOrder[index % splitOrder.length]));

for (const [scenarioId, items] of classified) {
  if (items.length !== 60) {
    throw new Error(`${scenarioId} 应有 60 条候选，实际 ${items.length}`);
  }
  const remaining = items.filter(({ id }) => !assignmentIds.has(id)).sort(
    (left, right) => sha256(`ai-only-v1/${left.id}`).localeCompare(
      sha256(`ai-only-v1/${right.id}`),
    ),
  );
  for (const item of remaining) {
    const split = splitOrder.find((value) =>
      (assigned[value].get(scenarioId)?.length ?? 0) < perScenarioTargets[value]);
    if (!split) throw new Error(`${scenarioId} 没有剩余切分容量`);
    assign(item, split);
  }
}

if (assignmentIds.size !== 300) throw new Error('未覆盖全部 300 条候选');
const reviewHash = sha256(reviewRaw);
const outputs = splitOrder.map((split) => {
  const scenarios = queue.scenarios.map((source) => ({
    ...source,
    benchmarkVersion,
    candidates: (assigned[split].get(source.id) ?? [])
      .sort((left, right) => left.givenName.localeCompare(right.givenName, 'zh-CN')),
  }));
  const dataset = {
    schemaVersion: 1,
    benchmarkVersion,
    reviewProtocol: 'ai-only-v1',
    sourceReviewSha256: reviewHash,
    split,
    status: 'frozen',
    frozenAt,
    scenarios,
  };
  return [`benchmark-v1.${split}.json`, `${JSON.stringify(dataset, null, 2)}\n`];
});

for (const [fileName, content] of outputs) {
  const filePath = path.join(directory, fileName);
  if (checkOnly) {
    if (await readFile(filePath, 'utf8').catch(() => '') !== content) {
      throw new Error(`${fileName} 与 AI 来源不一致`);
    }
  } else {
    await writeFile(filePath, content, 'utf8');
  }
}
console.log(`AI-only Benchmark ${checkOnly ? '校验' : '冻结'}完成：train 180 / validation 60 / holdout 60；来源 SHA-256 ${reviewHash}`);
