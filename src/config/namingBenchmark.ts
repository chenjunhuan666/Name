export const NAMING_BENCHMARK_VERSION = '1.1.0';

export const NAMING_BENCHMARK_LIMITS = {
  minimumCandidateCount: 300,
  requiredIndependentReviewCount: 2,
  topK: 20,
  trainRatio: 0.6,
  validationRatio: 0.2,
  holdoutRatio: 0.2,
} as const;

export const NAMING_BENCHMARK_RELEVANT_CLASSES = [
  'excellent',
  'good',
] as const;

export const NAMING_BENCHMARK_CLASS_GAIN = {
  excellent: 4,
  good: 3,
  acceptable: 2,
  poor: 1,
  reject: 0,
} as const;
