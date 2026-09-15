import type { SemanticPairAssessment } from '../../../types';
import { SEMANTIC_PAIR_SCORE } from '../../../config/namingScore';

export function passesSemanticFilter(
  assessment: SemanticPairAssessment,
): boolean {
  return (
    assessment.natural &&
    assessment.nameLike &&
    assessment.score >= SEMANTIC_PAIR_SCORE.filterMinimum
  );
}
