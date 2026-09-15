import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createNeutralReviewBatch } from './init-neutral-character-review-batch.mjs';

describe('中性候选审校批次初始化', () => {
  it('完整保留中性候选证据，并以 pending 状态隔离运行时导入', () => {
    const queue = {
      source: { commit: 'fixed-commit', dictionarySha256: 'fixed-dictionary' },
      entries: [
        {
          char: '甲',
          source: { sentiment: 'neutral', namingUsage: 30, rarityLevel: 2 },
          facts: { pinyin: 'jiǎ' },
          riskFlags: ['meaning-risk-keyword'],
        },
        {
          char: '乙',
          source: { sentiment: 'positive', namingUsage: 35, rarityLevel: 1 },
          facts: { pinyin: 'yǐ' },
          riskFlags: [],
        },
      ],
    };
    const queueText = `${JSON.stringify(queue)}\n`;

    const batch = createNeutralReviewBatch({
      queue,
      queueText,
      expectedCount: 1,
    });

    expect(batch.sourceQueue.sha256).toBe(
      createHash('sha256').update(queueText).digest('hex'),
    );
    expect(batch.entries).toEqual([
      {
        char: '甲',
        evidence: {
          source: queue.entries[0].source,
          facts: queue.entries[0].facts,
          riskFlags: queue.entries[0].riskFlags,
        },
        review: {
          decision: 'pending',
          note: '',
          approvedMeaning: '',
          reviewedBy: '',
          reviewedAt: '',
        },
      },
    ]);
    expect(batch.counts).toMatchObject({
      total: 1,
      pending: 1,
      approved: 0,
      rejected: 0,
      meaningRiskFlagged: 1,
    });
  });

  it('拒绝数量或字符唯一性不符合固定范围的输入', () => {
    const queue = {
      entries: [
        {
          char: '甲',
          source: { sentiment: 'neutral' },
          facts: {},
          riskFlags: [],
        },
        {
          char: '甲',
          source: { sentiment: 'neutral' },
          facts: {},
          riskFlags: [],
        },
      ],
    };

    expect(() =>
      createNeutralReviewBatch({
        queue,
        queueText: JSON.stringify(queue),
        expectedCount: 2,
      }),
    ).toThrow(/范围异常/);
  });
});
