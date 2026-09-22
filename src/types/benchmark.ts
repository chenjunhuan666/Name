import type { ElementTendency } from './bazi';
import type { NamingPreference } from './naming';

export type NameBenchmarkClass =
  | 'excellent'
  | 'good'
  | 'acceptable'
  | 'poor'
  | 'reject';

export type NameBenchmarkSplit = 'train' | 'validation' | 'holdout';

export interface NameBenchmarkJudgement {
  givenName: string;
  expectedClass: NameBenchmarkClass;
  tags: string[];
  reasons: string[];
  shouldPassHardFilter: boolean;
  reviewProtocol: 'ai-only-v1';
  sourceCandidateId: string;
  reviewerIds: string[];
  adjudicated: boolean;
  adjudicatedBy: string;
  hardFilterEvidence:
    | 'explicit-risk'
    | 'ai-reviewed-no-risk'
    | 'conservative-no-clear-risk';
  factGap?: string;
  leakageGroupId: string;
}

export interface NameBenchmarkScenario {
  id: string;
  benchmarkVersion: string;
  surname: string;
  fixedTendencies: ElementTendency[];
  preference: NamingPreference;
  resultLimit: number;
  dataVersion: string;
  ruleVersion: string;
  candidates: NameBenchmarkJudgement[];
}

export interface NameBenchmarkDataset {
  schemaVersion: 1;
  benchmarkVersion: string;
  reviewProtocol: 'ai-only-v1';
  sourceReviewSha256: string;
  split: NameBenchmarkSplit;
  status: 'draft' | 'frozen';
  frozenAt?: string;
  scenarios: NameBenchmarkScenario[];
}

export interface NamingBenchmarkCandidateResult {
  scenarioId: string;
  givenName: string;
  score: number;
  passedHardFilter: boolean;
  retrieved: boolean;
}

export interface NamingBenchmarkMetrics {
  top20Precision: number;
  top20Recall: number;
  ndcg20: number;
  rejectRecall: number;
  rejectPrecision: number;
  pairwiseAccuracy: number;
  diversityScore: number;
}

export interface NamingBenchmarkRun {
  benchmarkVersion: string;
  evaluatedNamingModelVersion: string;
  dataVersion: string;
  ruleVersion: string;
  splits: NameBenchmarkSplit[];
  scenarioCount: number;
  candidateCount: number;
  metrics: NamingBenchmarkMetrics;
  outputHash: string;
}
