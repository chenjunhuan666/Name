import { HOMOPHONE_SCORE } from '../../config/namingScore';
import { BAD_HOMOPHONES } from '../../data/badHomophones';
import type { HomophoneAssessment, HomophoneMatch } from '../../types';
import { normalizePinyin } from './phonetic';

function approximatePinyin(value: string): string {
  return value
    .replaceAll('zh', 'z')
    .replaceAll('ch', 'c')
    .replaceAll('sh', 's')
    .replaceAll('eng', 'en')
    .replaceAll('ing', 'in');
}

export function assessHomophone(
  surnamePinyin: string[],
  givenNamePinyin: string[],
): HomophoneAssessment {
  const normalizedSurname = surnamePinyin.map(normalizePinyin).join('');
  const normalizedGivenName = givenNamePinyin.map(normalizePinyin).join('');
  const normalizedFullName = normalizedSurname + normalizedGivenName;
  const normalizedSurnameFirst =
    normalizedSurname + normalizePinyin(givenNamePinyin[0] ?? '');
  const candidates = {
    given: normalizedGivenName,
    full: normalizedFullName,
    'surname-first': normalizedSurnameFirst,
  } as const;

  const details: HomophoneMatch[] = BAD_HOMOPHONES.flatMap((entry) => {
    const candidate = candidates[entry.scope];
    const exact = candidate === entry.pinyin;
    const approximate =
      !exact &&
      entry.approximate === true &&
      approximatePinyin(candidate) === approximatePinyin(entry.pinyin);

    return exact || approximate
      ? [
          {
            label: entry.label,
            scope: entry.scope,
            category: entry.category ?? 'negative',
            matchType: exact ? 'exact' : 'approximate',
          } satisfies HomophoneMatch,
        ]
      : [];
  });
  const exactMatches = details.filter(({ matchType }) => matchType === 'exact');
  const approximateMatches = details.filter(
    ({ matchType }) => matchType === 'approximate',
  );

  return {
    safe: exactMatches.length === 0,
    score: exactMatches.length
      ? HOMOPHONE_SCORE.exact
      : approximateMatches.length
        ? HOMOPHONE_SCORE.approximate
        : HOMOPHONE_SCORE.safe,
    normalizedFullName,
    matches: details.map(
      ({ label, matchType }) =>
        `${label}${matchType === 'approximate' ? '（近音）' : ''}`,
    ),
    details,
  };
}
