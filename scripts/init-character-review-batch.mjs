import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const queuePath =
  process.argv[2] ?? 'docs/recommended-character-review.json';
const outputPath =
  process.argv[3] ?? 'docs/recommended-character-review-batch-01.json';

const queueText = await readFile(queuePath, 'utf8');
const queue = JSON.parse(queueText);
if (!Array.isArray(queue.entries)) {
  throw new Error('审校队列格式错误：缺少 entries 数组');
}

const entries = queue.entries
  .filter(({ source }) => source.sentiment === 'positive')
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

if (entries.length !== 83) {
  throw new Error(`首批正向低阈值候选数量异常：期望 83，实际 ${entries.length}`);
}

const batch = {
  schemaVersion: 1,
  batchId: 'positive-below-production-threshold-01',
  sourceQueue: {
    path: queuePath,
    sha256: createHash('sha256').update(queueText).digest('hex'),
    sourceCommit: queue.source.commit,
    dictionarySha256: queue.source.dictionarySha256,
  },
  policy: {
    scope:
      '83 characters marked positive by the source but below the production namingUsage threshold of 40',
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
  },
  counts: { total: entries.length, pending: entries.length, approved: 0, rejected: 0 },
  entries,
};

await writeFile(outputPath, `${JSON.stringify(batch, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
});
console.log(`已初始化 ${entries.length} 字首批审校文件：${outputPath}`);
