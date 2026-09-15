import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BATCH_ID = 'neutral-candidates-02';
const DEFAULT_EXPECTED_COUNT = 988;

export function createNeutralReviewBatch({
  queue,
  queueText,
  expectedCount = DEFAULT_EXPECTED_COUNT,
}) {
  if (!Array.isArray(queue?.entries)) {
    throw new Error('审校队列格式错误：缺少 entries 数组');
  }

  const entries = queue.entries
    .filter(({ source }) => source?.sentiment === 'neutral')
    .map(({ char, source, facts, riskFlags }) => ({
      char,
      evidence: { source, facts, riskFlags },
      review: {
        decision: 'pending',
        note: '',
        approvedMeaning: '',
        reviewedBy: '',
        reviewedAt: '',
      },
    }));
  const uniqueCharacters = new Set(entries.map(({ char }) => char));

  if (entries.length !== expectedCount || uniqueCharacters.size !== entries.length) {
    throw new Error(
      `中性候选审校范围异常：期望 ${expectedCount} 个不重复字符，实际 ${entries.length} 个、去重后 ${uniqueCharacters.size} 个`,
    );
  }

  const meaningRiskFlagged = entries.filter(({ evidence }) =>
    evidence.riskFlags.includes('meaning-risk-keyword'),
  ).length;

  return {
    schemaVersion: 1,
    batchId: DEFAULT_BATCH_ID,
    sourceQueue: {
      path: 'docs/recommended-character-review.json',
      sha256: createHash('sha256').update(queueText).digest('hex'),
      sourceCommit: queue.source?.commit,
      dictionarySha256: queue.source?.dictionarySha256,
    },
    policy: {
      scope:
        'all neutral-sentiment candidates from the fixed review queue; no entry is approved or imported by initialization',
      entryEligibility: {
        sentiments: ['neutral'],
        namingUsage: { min: 30 },
        rarityLevel: { maxInclusive: 2 },
      },
      allowedDecisions: ['pending', 'approved', 'rejected'],
      approvalRequirements: [
        'review.decision must be approved',
        'review.note must explain the naming suitability decision',
        'review.approvedMeaning must contain the reviewer-confirmed runtime meaning',
        'review.reviewedBy must identify the reviewer',
        'review.reviewedAt must be an ISO-8601 timestamp',
      ],
      overwriteProtection:
        'this initializer uses exclusive creation and must never overwrite an existing review file',
      runtimeEffect:
        'none; pending and rejected entries must never enter the runtime recommendation library',
    },
    counts: {
      total: entries.length,
      pending: entries.length,
      approved: 0,
      rejected: 0,
      meaningRiskFlagged,
    },
    entries,
  };
}

export async function main(args = process.argv.slice(2)) {
  const queuePath = args[0] ?? 'docs/recommended-character-review.json';
  const outputPath =
    args[1] ?? 'docs/recommended-character-review-batch-02-neutral.json';
  const queueText = await readFile(queuePath, 'utf8');
  const batch = createNeutralReviewBatch({
    queue: JSON.parse(queueText),
    queueText,
  });

  await writeFile(outputPath, `${JSON.stringify(batch, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  console.log(
    `已初始化 ${batch.counts.total} 个中性候选审校记录（含义风险标记 ${batch.counts.meaningRiskFlagged}）：${outputPath}`,
  );
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  await main();
}
