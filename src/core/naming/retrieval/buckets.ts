import { CHARACTER_RANK_SCORE } from '../../../config/namingScore';
import type {
  ElementTendency,
  NamingCharacter,
  NamingPreference,
} from '../../../types';

function primaryElements(character: NamingCharacter) {
  return Array.isArray(character.element)
    ? character.element
    : [character.element];
}

export function scoreNamingCharacter(
  character: NamingCharacter,
  tendencies?: ElementTendency[],
  preference?: NamingPreference,
): number {
  const tendencyMap = new Map(
    tendencies?.map(({ element, level }) => [element, level]) ?? [],
  );
  const preferredStyles = new Set(preference?.styles ?? []);
  const included = new Set(preference?.includeCharacters ?? []);
  const elementScore = Math.max(
    ...primaryElements(character).map(
      (element) =>
        tendencyMap.get(element) ?? CHARACTER_RANK_SCORE.defaultElementLevel,
    ),
  );
  const styleScore = character.styleTags.filter((style) =>
    preferredStyles.has(style as NamingPreference['styles'][number]),
  ).length;
  const genderScore =
    !preference ||
    preference.genderExpression === 'neutral' ||
    character.gender === 'neutral' ||
    (preference.genderExpression === 'masculine' &&
      character.gender === 'male') ||
    (preference.genderExpression === 'feminine' &&
      character.gender === 'female')
      ? 1
      : 0;

  return (
    elementScore * CHARACTER_RANK_SCORE.elementMultiplier +
    styleScore * CHARACTER_RANK_SCORE.styleMatchBonus +
    genderScore * CHARACTER_RANK_SCORE.genderMatchBonus +
    (included.has(character.char)
      ? CHARACTER_RANK_SCORE.includedCharacterBonus
      : 0) -
    character.rarity * CHARACTER_RANK_SCORE.rarityPenaltyMultiplier
  );
}

export function rankNamingCharacters(
  characters: readonly NamingCharacter[],
  tendencies?: ElementTendency[],
  preference?: NamingPreference,
): NamingCharacter[] {
  return [...characters].sort(
    (left, right) =>
      scoreNamingCharacter(right, tendencies, preference) -
        scoreNamingCharacter(left, tendencies, preference) ||
      left.char.localeCompare(right.char, 'zh-CN'),
  );
}
