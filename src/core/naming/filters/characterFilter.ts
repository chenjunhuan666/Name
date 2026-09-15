import type { NamingCharacter, NamingPreference } from '../../../types';
import { passesRarityFilter } from './rarityFilter';

export function filterCharacterPool(
  characters: readonly NamingCharacter[],
  preference?: NamingPreference,
): NamingCharacter[] {
  const excluded = new Set(preference?.excludeCharacters ?? []);
  const excludedStyles = new Set<string>(preference?.excludeStyles ?? []);

  return characters.filter(
    (character) =>
      [...character.char].length === 1 &&
      !character.negative &&
      !excluded.has(character.char) &&
      !character.styleTags.some((style) => excludedStyles.has(style)) &&
      passesRarityFilter(character, preference),
  );
}
