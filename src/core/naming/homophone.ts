import { BAD_HOMOPHONES } from '../../data/badHomophones';
import type { HomophoneAssessment } from '../../types';
import { normalizePinyin } from './phonetic';

export function assessHomophone(
  surnamePinyin: string[],
  givenNamePinyin: string[],
): HomophoneAssessment {
  const normalizedSurname = surnamePinyin.map(normalizePinyin).join('');
  const normalizedGivenName = givenNamePinyin.map(normalizePinyin).join('');
  const normalizedFullName = normalizedSurname + normalizedGivenName;
  const matches = BAD_HOMOPHONES.filter((entry) =>
    entry.scope === 'given'
      ? normalizedGivenName === entry.pinyin
      : normalizedFullName === entry.pinyin,
  ).map(({ label }) => label);

  return {
    safe: matches.length === 0,
    score: matches.length ? 0 : 100,
    normalizedFullName,
    matches,
  };
}
