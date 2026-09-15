import type { HomophoneAssessment } from '../../../types';

export function passesHomophoneFilter(
  assessment: HomophoneAssessment,
): boolean {
  return assessment.safe;
}
