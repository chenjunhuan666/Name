import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FEATURES } from '../../config/featureFlags';
import type {
  NameBenchmarkDataset,
  NameBenchmarkScenario,
  NamingBenchmarkCandidateResult,
} from '../../types';
import {
  calculateNamingBenchmarkMetrics,
  createNamingBenchmarkRun,
  findBenchmarkLeakage,
  validateFrozenBenchmark,
} from './benchmark';

const scenario: NameBenchmarkScenario = {
  id: 'balanced-chen',
  benchmarkVersion: '1.1.0',
  surname: '陈',
  fixedTendencies: [
    { element: '木', level: 5, relation: '日主所生', weightedPresence: 0, reason: '固定输入，用于隔离八字算法' },
  ],
  preference: {
    styles: ['清雅'],
    rarityPreference: 'balanced',
    genderExpression: 'neutral',
  },
  resultLimit: 20,
  dataVersion: '3.0.0',
  ruleVersion: '3.0.0',
  candidates: [
    {
      givenName: '清和',
      expectedClass: 'excellent',
      tags: ['自然'],
      reasons: ['语义完整且读音自然'],
      shouldPassHardFilter: true,
      reviewProtocol: 'ai-only-v1',
      sourceCandidateId: 'test-001',
      reviewerIds: ['ai-review-a', 'ai-review-b'],
      adjudicated: true,
      adjudicatedBy: 'ai-review-final',
      hardFilterEvidence: 'conservative-no-clear-risk',
      factGap: '测试数据，未证实其他硬风险',
      leakageGroupId: '清和',
    },
    {
      givenName: '景安',
      expectedClass: 'good',
      tags: ['稳健'],
      reasons: ['含义明确'],
      shouldPassHardFilter: true,
      reviewProtocol: 'ai-only-v1',
      sourceCandidateId: 'test-002',
      reviewerIds: ['ai-review-a', 'ai-review-b'],
      adjudicated: true,
      adjudicatedBy: 'ai-review-final',
      hardFilterEvidence: 'conservative-no-clear-risk',
      factGap: '测试数据，未证实其他硬风险',
      leakageGroupId: '景安',
    },
    {
      givenName: '承远',
      expectedClass: 'acceptable',
      tags: ['普通'],
      reasons: ['可以使用但辨识度一般'],
      shouldPassHardFilter: true,
      reviewProtocol: 'ai-only-v1',
      sourceCandidateId: 'test-003',
      reviewerIds: ['ai-review-a', 'ai-review-b'],
      adjudicated: true,
      adjudicatedBy: 'ai-review-final',
      hardFilterEvidence: 'conservative-no-clear-risk',
      factGap: '测试数据，未证实其他硬风险',
      leakageGroupId: '承远',
    },
    {
      givenName: '福天',
      expectedClass: 'poor',
      tags: ['组合弱'],
      reasons: ['组合自然度不足'],
      shouldPassHardFilter: true,
      reviewProtocol: 'ai-only-v1',
      sourceCandidateId: 'test-004',
      reviewerIds: ['ai-review-a', 'ai-review-b'],
      adjudicated: true,
      adjudicatedBy: 'ai-review-final',
      hardFilterEvidence: 'conservative-no-clear-risk',
      factGap: '测试数据，未证实其他硬风险',
      leakageGroupId: '福天',
    },
    {
      givenName: '珍香',
      expectedClass: 'reject',
      tags: ['负面谐音'],
      reasons: ['与姓氏组合存在明确负面谐音'],
      shouldPassHardFilter: false,
      reviewProtocol: 'ai-only-v1',
      sourceCandidateId: 'test-005',
      reviewerIds: ['ai-review-a', 'ai-review-b'],
      adjudicated: true,
      adjudicatedBy: 'ai-review-final',
      hardFilterEvidence: 'explicit-risk',
      leakageGroupId: '珍香',
    },
  ],
};

const results: NamingBenchmarkCandidateResult[] = [
  { scenarioId: scenario.id, givenName: '清和', score: 95, passedHardFilter: true, retrieved: true },
  { scenarioId: scenario.id, givenName: '景安', score: 90, passedHardFilter: true, retrieved: true },
  { scenarioId: scenario.id, givenName: '承远', score: 80, passedHardFilter: true, retrieved: true },
  { scenarioId: scenario.id, givenName: '福天', score: 70, passedHardFilter: true, retrieved: true },
  { scenarioId: scenario.id, givenName: '珍香', score: 0, passedHardFilter: false, retrieved: false },
];

function dataset(
  split: NameBenchmarkDataset['split'],
  scenarios: NameBenchmarkScenario[],
): NameBenchmarkDataset {
  return {
    schemaVersion: 1,
    benchmarkVersion: '1.1.0',
    reviewProtocol: 'ai-only-v1',
    sourceReviewSha256: 'a'.repeat(64),
    split,
    status: 'frozen',
    frozenAt: '2026-09-22T00:00:00.000Z',
    scenarios,
  };
}

describe('姓名质量 Benchmark', () => {
  it('按冻结口径计算排序、检索、拒绝和多样性指标', () => {
    expect(calculateNamingBenchmarkMetrics([scenario], results)).toEqual({
      top20Precision: 0.4,
      top20Recall: 1,
      ndcg20: 1,
      rejectRecall: 1,
      rejectPrecision: 1,
      pairwiseAccuracy: 1,
      diversityScore: 1,
    });
  });

  it('只在同一固定场景内比较排序，不跨场景比较绝对分数', () => {
    const firstScenario = {
      ...structuredClone(scenario),
      id: 'first',
      candidates: [scenario.candidates[0], scenario.candidates[4]],
    };
    const secondScenario = {
      ...structuredClone(scenario),
      id: 'second',
      candidates: [scenario.candidates[1], scenario.candidates[3]],
    };
    const isolatedResults: NamingBenchmarkCandidateResult[] = [
      { scenarioId: 'first', givenName: '清和', score: 100, passedHardFilter: true, retrieved: true },
      { scenarioId: 'first', givenName: '珍香', score: 90, passedHardFilter: false, retrieved: false },
      { scenarioId: 'second', givenName: '景安', score: 10, passedHardFilter: true, retrieved: true },
      { scenarioId: 'second', givenName: '福天', score: 0, passedHardFilter: true, retrieved: true },
    ];

    expect(
      calculateNamingBenchmarkMetrics(
        [firstScenario, secondScenario],
        isolatedResults,
      ).pairwiseAccuracy,
    ).toBe(1);
  });

  it('拒绝缺失、重复或不属于冻结场景的运行结果', () => {
    expect(() =>
      calculateNamingBenchmarkMetrics([scenario], results.slice(0, -1)),
    ).toThrow('缺少运行结果：balanced-chen/珍香');
    expect(() =>
      calculateNamingBenchmarkMetrics([scenario], [...results, results[0]]),
    ).toThrow('重复运行结果：balanced-chen/清和');
    expect(() =>
      calculateNamingBenchmarkMetrics([scenario], [
        ...results,
        {
          scenarioId: scenario.id,
          givenName: '额外姓名',
          score: 50,
          passedHardFilter: true,
          retrieved: false,
        },
      ]),
    ).toThrow('未标注运行结果：balanced-chen/额外姓名');
  });

  it('拒绝未仲裁、审校人不足或规模不足的冻结数据', () => {
    const invalid = structuredClone(scenario);
    invalid.candidates[0].adjudicated = false;
    invalid.candidates[0].reviewerIds = ['ai-review-a'];

    const issues = validateFrozenBenchmark([
      dataset('train', [invalid]),
      dataset('validation', []),
      dataset('holdout', []),
    ]);

    expect(issues).toContain('冻结基准总候选数 5，低于 300 条下限');
    expect(issues).toContain('balanced-chen/清和：未完成分歧仲裁');
    expect(issues).toContain('balanced-chen/清和：需要至少两份不同 AI 独立审查');
  });

  it('AI-only 冻结数据必须标明来源，不能以人工身份冒充审查', () => {
    const invalid = structuredClone(scenario);
    invalid.candidates[0].reviewerIds = ['human-a', 'human-b'];
    const issues = validateFrozenBenchmark([
      dataset('train', [invalid]),
      dataset('validation', []),
      dataset('holdout', []),
    ]);
    expect(issues).toContain('balanced-chen/清和：AI-only 审查来源无效');
  });

  it('检测姓名及语义近似组跨 train、validation、holdout 泄漏', () => {
    const validationScenario = structuredClone(scenario);
    validationScenario.id = 'validation-chen';
    validationScenario.candidates = [
      { ...structuredClone(scenario.candidates[0]), givenName: '和清' },
    ];

    expect(
      findBenchmarkLeakage([
        dataset('train', [scenario]),
        dataset('validation', [validationScenario]),
        dataset('holdout', []),
      ]),
    ).toEqual([
      '姓名语义组 清和 同时出现在 train、validation',
    ]);
  });

  it('机器可读运行结果包含稳定 hash 与完整版本', () => {
    const first = createNamingBenchmarkRun({
      datasets: [dataset('holdout', [scenario])],
      results,
      evaluatedNamingModelVersion: '3.0.0',
      dataVersion: '3.0.0',
      ruleVersion: '3.0.0',
    });
    const second = createNamingBenchmarkRun({
      datasets: [dataset('holdout', [scenario])],
      results: [...results].reverse(),
      evaluatedNamingModelVersion: '3.0.0',
      dataVersion: '3.0.0',
      ruleVersion: '3.0.0',
    });

    expect(first.outputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toEqual(first);
    expect(first.candidateCount).toBe(5);
  });

  it('保留原始空白审查包，并校验 300 条 AI-only 冻结数据', () => {
    const queue = JSON.parse(
      readFileSync(
        new URL('../../../docs/naming-benchmark/benchmark-v1.review-queue.json', import.meta.url),
        'utf8',
      ),
    ) as {
      status: string;
      scenarios: Array<{ id: string }>;
      candidates: Array<{
        id: string;
        blindReviews: Array<{
          reviewerId: string | null;
          expectedClass: string | null;
          reasons: string[];
        }>;
        adjudication: unknown;
      }>;
    };
    const frozenDatasets = ['train', 'validation', 'holdout'].map((split) =>
      JSON.parse(
        readFileSync(
          new URL(
            `../../../docs/naming-benchmark/benchmark-v1.${split}.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      ) as NameBenchmarkDataset,
    );
    const blindPackets = ['a', 'b'].map((slot) =>
      JSON.parse(
        readFileSync(
          new URL(
            `../../../docs/naming-benchmark/benchmark-v1.review-${slot}.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      ) as {
        reviewerSlot: string;
        candidates: Array<{
          id: string;
          review: {
            reviewerId: string | null;
            expectedClass: string | null;
            reasons: string[];
          };
        }>;
      },
    );

    expect(FEATURES.benchmarkModel).toBe(false);
    expect(queue.status).toBe('source-queue-frozen');
    expect(queue.scenarios).toHaveLength(5);
    expect(queue.candidates).toHaveLength(300);
    expect(new Set(queue.candidates.map(({ id }) => id)).size).toBe(300);
    expect(
      queue.candidates.every(
        ({ blindReviews, adjudication }) =>
          adjudication === null &&
          blindReviews.length === 2 &&
          blindReviews.every(
            ({ reviewerId, expectedClass, reasons }) =>
              reviewerId === null && expectedClass === null && reasons.length === 0,
          ),
      ),
    ).toBe(true);
    expect(blindPackets.map(({ reviewerSlot }) => reviewerSlot)).toEqual(['A', 'B']);
    expect(
      blindPackets.every(
        ({ candidates }) =>
          candidates.length === 300 &&
          candidates.every(
            ({ review }) =>
              review.reviewerId === null &&
              review.expectedClass === null &&
              review.reasons.length === 0,
          ),
      ),
    ).toBe(true);
    expect(
      blindPackets[0].candidates.map(({ id }) => id),
    ).toEqual(blindPackets[1].candidates.map(({ id }) => id));
    expect(
      frozenDatasets.map(({ split, status, scenarios }) => ({
        split,
        status,
        candidateCount: scenarios.reduce((total, item) => total + item.candidates.length, 0),
      })),
    ).toEqual([
      { split: 'train', status: 'frozen', candidateCount: 180 },
      { split: 'validation', status: 'frozen', candidateCount: 60 },
      { split: 'holdout', status: 'frozen', candidateCount: 60 },
    ]);
    expect(validateFrozenBenchmark(frozenDatasets)).toEqual([]);
    expect(frozenDatasets.every(({ reviewProtocol }) => reviewProtocol === 'ai-only-v1')).toBe(true);
    expect(frozenDatasets[2].scenarios.flatMap(({ candidates }) => candidates)
      .some(({ expectedClass }) => expectedClass === 'reject')).toBe(true);
  });

  it('冻结 V2 AI-only 质量基线和相对准入门槛', () => {
    const baseline = JSON.parse(
      readFileSync(
        new URL('../../../docs/naming-benchmark/reports/baseline-v2.ai.json', import.meta.url),
        'utf8',
      ),
    ) as {
      reviewProtocol: string;
      runs: Record<'train' | 'validation' | 'holdout', { candidateCount: number; outputHash: string }>;
    };
    const thresholds = JSON.parse(
      readFileSync(
        new URL('../../../docs/naming-benchmark/reports/thresholds-v1.ai.json', import.meta.url),
        'utf8',
      ),
    ) as {
      status: string;
      reviewProtocol: string;
      basedOnHoldoutOutputHash: string;
      noRegressionMetrics: string[];
      mustImproveOneOf: string[];
    };
    const readiness = JSON.parse(
      readFileSync(
        new URL('../../../docs/naming-benchmark/reports/phase2-readiness.json', import.meta.url),
        'utf8',
      ),
    ) as {
      status: string;
      reviewProtocol: string;
      datasetsFrozen: boolean;
      v2HoldoutOutputHash: string;
      thresholdsFrozen: boolean;
    };

    expect(baseline.reviewProtocol).toBe('ai-only-v1');
    expect([
      baseline.runs.train.candidateCount,
      baseline.runs.validation.candidateCount,
      baseline.runs.holdout.candidateCount,
    ]).toEqual([180, 60, 60]);
    expect(thresholds.status).toBe('frozen');
    expect(thresholds.reviewProtocol).toBe('ai-only-v1');
    expect(thresholds.basedOnHoldoutOutputHash).toBe(baseline.runs.holdout.outputHash);
    expect(thresholds.noRegressionMetrics).toHaveLength(7);
    expect(thresholds.mustImproveOneOf.length).toBeGreaterThan(0);
    expect(readiness).toMatchObject({
      status: 'complete',
      reviewProtocol: 'ai-only-v1',
      datasetsFrozen: true,
      thresholdsFrozen: true,
      v2HoldoutOutputHash: baseline.runs.holdout.outputHash,
    });
  });
});
