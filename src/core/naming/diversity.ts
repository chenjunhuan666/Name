import type { GeneratedName } from '../../types';
import { DIVERSITY_LIMITS } from '../../config/namingScore';

export interface DiversityOptions {
  firstCharacterLimit: number;
  secondCharacterLimit: number;
  elementPairLimit: number;
  classicSourceLimit: number;
}

const DEFAULT_OPTIONS: DiversityOptions = {
  firstCharacterLimit: DIVERSITY_LIMITS.firstCharacter,
  secondCharacterLimit: DIVERSITY_LIMITS.secondCharacter,
  elementPairLimit: DIVERSITY_LIMITS.elementPair,
  classicSourceLimit: DIVERSITY_LIMITS.classicSource,
};

function increment(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

export function rerankForDiversity(
  names: readonly GeneratedName[],
  limit: number,
  options: DiversityOptions = DEFAULT_OPTIONS,
): GeneratedName[] {
  const result: GeneratedName[] = [];
  const firstCounts = new Map<string, number>();
  const secondCounts = new Map<string, number>();
  const elementPairCounts = new Map<string, number>();
  const classicSourceCounts = new Map<string, number>();

  for (const name of names) {
    const [first, second] = [...name.givenName];
    const elementPair = name.elements.slice(0, 2).join('-');
    const classicSource = name.classic?.source;
    if (
      (firstCounts.get(first) ?? 0) >= options.firstCharacterLimit ||
      (secondCounts.get(second) ?? 0) >= options.secondCharacterLimit ||
      (elementPairCounts.get(elementPair) ?? 0) >= options.elementPairLimit ||
      (classicSource &&
        (classicSourceCounts.get(classicSource) ?? 0) >=
          options.classicSourceLimit)
    ) {
      continue;
    }

    result.push(name);
    increment(firstCounts, first);
    increment(secondCounts, second);
    increment(elementPairCounts, elementPair);
    if (classicSource) {
      increment(classicSourceCounts, classicSource);
    }
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}
