import { createHash } from 'node:crypto';
import {
  NAMING_BENCHMARK_CLASS_GAIN,
  NAMING_BENCHMARK_LIMITS,
  NAMING_BENCHMARK_RELEVANT_CLASSES,
} from '../../config/namingBenchmark';
import type {
  NameBenchmarkClass,
  NameBenchmarkDataset,
  NameBenchmarkScenario,
  NamingBenchmarkCandidateResult,
  NamingBenchmarkMetrics,
  NamingBenchmarkRun,
} from '../../types';

const relevantClasses = new Set<NameBenchmarkClass>(
  NAMING_BENCHMARK_RELEVANT_CLASSES,
);

function roundMetric(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : roundMetric(numerator / denominator);
}

function discountedGain(gains: readonly number[]): number {
  return gains.reduce(
    (total, gain, index) => total + (2 ** gain - 1) / Math.log2(index + 2),
    0,
  );
}

function resultKey(scenarioId: string, givenName: string): string {
  return `${scenarioId}\u0000${givenName}`;
}

export function calculateNamingBenchmarkMetrics(
  scenarios: readonly NameBenchmarkScenario[],
  results: readonly NamingBenchmarkCandidateResult[],
): NamingBenchmarkMetrics {
  const resultMap = new Map<string, NamingBenchmarkCandidateResult>();
  for (const result of results) {
    const key = resultKey(result.scenarioId, result.givenName);
    if (resultMap.has(key)) {
      throw new Error(`重复运行结果：${result.scenarioId}/${result.givenName}`);
    }
    resultMap.set(key, result);
  }
  const labelledKeys = new Set(
    scenarios.flatMap((scenario) =>
      scenario.candidates.map((candidate) =>
        resultKey(scenario.id, candidate.givenName),
      ),
    ),
  );
  for (const result of results) {
    if (!labelledKeys.has(resultKey(result.scenarioId, result.givenName))) {
      throw new Error(`未标注运行结果：${result.scenarioId}/${result.givenName}`);
    }
  }
  const evaluatedByScenario = scenarios.map((scenario) =>
    scenario.candidates.map((judgement) => {
      const result = resultMap.get(resultKey(scenario.id, judgement.givenName));
      if (!result) {
        throw new Error(`缺少运行结果：${scenario.id}/${judgement.givenName}`);
      }
      return { judgement, result };
    }),
  );
  const evaluated = evaluatedByScenario.flat();
  const relevant = evaluated.filter(({ judgement }) =>
    relevantClasses.has(judgement.expectedClass),
  );
  const retrievedRelevant = relevant.filter(({ result }) => result.retrieved);
  const actualRejects = evaluated.filter(
    ({ judgement }) => judgement.expectedClass === 'reject',
  );
  const predictedRejects = evaluated.filter(
    ({ result }) => !result.passedHardFilter,
  );
  const correctlyRejected = actualRejects.filter(
    ({ result }) => !result.passedHardFilter,
  );
  let pairwiseCorrect = 0;
  let pairwiseTotal = 0;
  let topRelevant = 0;
  let topCount = 0;
  let ndcgTotal = 0;
  let ndcgScenarioCount = 0;
  let diversityTotal = 0;

  for (const scenarioCandidates of evaluatedByScenario) {
    const ranked = [...scenarioCandidates].sort(
      (left, right) =>
        right.result.score - left.result.score ||
        left.result.givenName.localeCompare(right.result.givenName, 'zh-CN'),
    );
    const top = ranked.slice(0, NAMING_BENCHMARK_LIMITS.topK);
    topRelevant += top.filter(({ judgement }) =>
      relevantClasses.has(judgement.expectedClass),
    ).length;
    topCount += top.length;

    const actualGains = top.map(
      ({ judgement }) => NAMING_BENCHMARK_CLASS_GAIN[judgement.expectedClass],
    );
    const idealGains = scenarioCandidates
      .map(({ judgement }) => NAMING_BENCHMARK_CLASS_GAIN[judgement.expectedClass])
      .sort((left, right) => right - left)
      .slice(0, NAMING_BENCHMARK_LIMITS.topK);
    const idealDcg = discountedGain(idealGains);
    if (idealDcg > 0) {
      ndcgTotal += discountedGain(actualGains) / idealDcg;
      ndcgScenarioCount += 1;
    }

    for (let leftIndex = 0; leftIndex < scenarioCandidates.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < scenarioCandidates.length;
        rightIndex += 1
      ) {
        const left = scenarioCandidates[leftIndex];
        const right = scenarioCandidates[rightIndex];
        const leftGain = NAMING_BENCHMARK_CLASS_GAIN[left.judgement.expectedClass];
        const rightGain = NAMING_BENCHMARK_CLASS_GAIN[right.judgement.expectedClass];
        if (leftGain === rightGain) {
          continue;
        }
        pairwiseTotal += 1;
        const expectedDirection = Math.sign(leftGain - rightGain);
        const actualDirection = Math.sign(left.result.score - right.result.score);
        pairwiseCorrect += actualDirection === 0
          ? 0.5
          : actualDirection === expectedDirection
            ? 1
            : 0;
      }
    }

    const diversityCandidates = top.filter(
      ({ result }) => result.retrieved && result.passedHardFilter,
    );
    const firstCharacters = new Set(
      diversityCandidates.map(({ judgement }) => [...judgement.givenName][0]),
    );
    const secondCharacters = new Set(
      diversityCandidates.map(({ judgement }) => [...judgement.givenName][1]),
    );
    const diversityDenominator = diversityCandidates.length;
    diversityTotal += diversityDenominator === 0
      ? 0
      : (firstCharacters.size / diversityDenominator +
          secondCharacters.size / diversityDenominator) /
        2;
  }

  return {
    top20Precision: safeRatio(topRelevant, topCount),
    top20Recall: safeRatio(retrievedRelevant.length, relevant.length),
    ndcg20: safeRatio(ndcgTotal, ndcgScenarioCount),
    rejectRecall: safeRatio(correctlyRejected.length, actualRejects.length),
    rejectPrecision: safeRatio(correctlyRejected.length, predictedRejects.length),
    pairwiseAccuracy: safeRatio(pairwiseCorrect, pairwiseTotal),
    diversityScore: safeRatio(diversityTotal, evaluatedByScenario.length),
  };
}

export function findBenchmarkLeakage(
  datasets: readonly NameBenchmarkDataset[],
): string[] {
  const names = new Map<string, Set<string>>();
  const semanticGroups = new Map<string, Set<string>>();

  for (const dataset of datasets) {
    for (const scenario of dataset.scenarios) {
      for (const candidate of scenario.candidates) {
        const fullName = `${scenario.surname}${candidate.givenName}`.normalize('NFC');
        const nameSplits = names.get(fullName) ?? new Set<string>();
        nameSplits.add(dataset.split);
        names.set(fullName, nameSplits);

        const groupSplits = semanticGroups.get(candidate.leakageGroupId) ?? new Set<string>();
        groupSplits.add(dataset.split);
        semanticGroups.set(candidate.leakageGroupId, groupSplits);
      }
    }
  }

  const issues: string[] = [];
  for (const [fullName, splits] of names) {
    if (splits.size > 1) {
      issues.push(`姓名 ${fullName} 同时出现在 ${[...splits].sort().join('、')}`);
    }
  }
  for (const [groupId, splits] of semanticGroups) {
    if (splits.size > 1) {
      issues.push(`姓名语义组 ${groupId} 同时出现在 ${[...splits].sort().join('、')}`);
    }
  }
  return issues.sort();
}

export function validateFrozenBenchmark(
  datasets: readonly NameBenchmarkDataset[],
): string[] {
  const issues: string[] = [];
  const allCandidates = datasets.flatMap((dataset) =>
    dataset.scenarios.flatMap((scenario) =>
      scenario.candidates.map((candidate) => ({ dataset, scenario, candidate })),
    ),
  );
  const benchmarkVersions = new Set(datasets.map(({ benchmarkVersion }) => benchmarkVersion));
  const sourceReviewHashes = new Set(datasets.map(({ sourceReviewSha256 }) => sourceReviewSha256));
  if (benchmarkVersions.size !== 1) {
    issues.push('冻结数据集 benchmarkVersion 不一致');
  }
  if (sourceReviewHashes.size !== 1) {
    issues.push('冻结数据集 AI 审查来源摘要不一致');
  }

  if (allCandidates.length < NAMING_BENCHMARK_LIMITS.minimumCandidateCount) {
    issues.push(
      `冻结基准总候选数 ${allCandidates.length}，低于 ${NAMING_BENCHMARK_LIMITS.minimumCandidateCount} 条下限`,
    );
  }
  const expectedSplitCounts = {
    train: Math.round(
      allCandidates.length * NAMING_BENCHMARK_LIMITS.trainRatio,
    ),
    validation: Math.round(
      allCandidates.length * NAMING_BENCHMARK_LIMITS.validationRatio,
    ),
    holdout: 0,
  };
  expectedSplitCounts.holdout =
    allCandidates.length -
    expectedSplitCounts.train -
    expectedSplitCounts.validation;
  for (const split of ['train', 'validation', 'holdout'] as const) {
    const matching = datasets.filter((dataset) => dataset.split === split);
    if (matching.length !== 1) {
      issues.push(`${split} 必须且只能存在一个数据集`);
    } else if (matching[0].status !== 'frozen' || !matching[0].frozenAt) {
      issues.push(`${split} 尚未冻结`);
    } else if (
      matching[0].reviewProtocol !== 'ai-only-v1' ||
      !/^[a-f0-9]{64}$/.test(matching[0].sourceReviewSha256)
    ) {
      issues.push(`${split}：缺少 AI-only 来源摘要`);
    }
    const actualCount = matching.flatMap(({ scenarios }) => scenarios).reduce(
      (total, scenario) => total + scenario.candidates.length,
      0,
    );
    if (actualCount !== expectedSplitCounts[split]) {
      issues.push(
        `${split} 候选数 ${actualCount}，应为 ${expectedSplitCounts[split]}`,
      );
    }
  }
  const presentClasses = new Set(
    allCandidates.map(({ candidate }) => candidate.expectedClass),
  );
  for (const expectedClass of Object.keys(
    NAMING_BENCHMARK_CLASS_GAIN,
  ) as NameBenchmarkClass[]) {
    if (!presentClasses.has(expectedClass)) {
      issues.push(`冻结基准缺少 ${expectedClass} 分类`);
    }
  }
  for (const { scenario, candidate } of allCandidates) {
    const prefix = `${scenario.id}/${candidate.givenName}`;
    if (!candidate.adjudicated) {
      issues.push(`${prefix}：未完成分歧仲裁`);
    }
    if (
      new Set(candidate.reviewerIds).size <
      NAMING_BENCHMARK_LIMITS.requiredIndependentReviewCount
    ) {
      issues.push(`${prefix}：需要至少两份不同 AI 独立审查`);
    }
    if (
      candidate.reviewProtocol !== 'ai-only-v1' ||
      !candidate.sourceCandidateId?.trim() ||
      candidate.reviewerIds.some((id) => !id.startsWith('ai-')) ||
      !candidate.adjudicatedBy?.startsWith('ai-') ||
      !candidate.hardFilterEvidence ||
      (candidate.hardFilterEvidence === 'conservative-no-clear-risk' &&
        !candidate.factGap?.trim()) ||
      (candidate.hardFilterEvidence === 'explicit-risk' &&
        candidate.shouldPassHardFilter) ||
      (candidate.hardFilterEvidence !== 'explicit-risk' &&
        !candidate.shouldPassHardFilter)
    ) {
      issues.push(`${prefix}：AI-only 审查来源无效`);
    }
    if (!candidate.reasons.length || !candidate.tags.length) {
      issues.push(`${prefix}：缺少标签理由或质量标签`);
    }
    if (!candidate.leakageGroupId.trim()) {
      issues.push(`${prefix}：缺少语义泄漏分组`);
    }
  }
  if (
    new Set(allCandidates.map(({ candidate }) => candidate.sourceCandidateId)).size !==
    allCandidates.length
  ) {
    issues.push('冻结候选 sourceCandidateId 存在重复');
  }

  issues.push(...findBenchmarkLeakage(datasets));
  return issues;
}

interface CreateNamingBenchmarkRunOptions {
  datasets: readonly NameBenchmarkDataset[];
  results: readonly NamingBenchmarkCandidateResult[];
  evaluatedNamingModelVersion: string;
  dataVersion: string;
  ruleVersion: string;
}

export function createNamingBenchmarkRun({
  datasets,
  results,
  evaluatedNamingModelVersion,
  dataVersion,
  ruleVersion,
}: CreateNamingBenchmarkRunOptions): NamingBenchmarkRun {
  const scenarios = datasets.flatMap(({ scenarios: value }) => value);
  const canonicalResults = [...results].sort(
    (left, right) =>
      left.scenarioId.localeCompare(right.scenarioId) ||
      left.givenName.localeCompare(right.givenName, 'zh-CN'),
  );
  const metrics = calculateNamingBenchmarkMetrics(scenarios, canonicalResults);
  const splits = [...new Set(datasets.map(({ split }) => split))].sort();
  const hashInput = JSON.stringify({
    benchmarkVersion: datasets[0]?.benchmarkVersion ?? 'unknown',
    evaluatedNamingModelVersion,
    dataVersion,
    ruleVersion,
    splits,
    scenarios,
    results: canonicalResults,
    metrics,
  });

  return {
    benchmarkVersion: datasets[0]?.benchmarkVersion ?? 'unknown',
    evaluatedNamingModelVersion,
    dataVersion,
    ruleVersion,
    splits,
    scenarioCount: scenarios.length,
    candidateCount: scenarios.reduce(
      (total, scenario) => total + scenario.candidates.length,
      0,
    ),
    metrics,
    outputHash: createHash('sha256').update(hashInput).digest('hex'),
  };
}
