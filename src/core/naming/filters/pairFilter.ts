import type {
  NamingCharacter,
  NamingPreference,
  SemanticPairAssessment,
} from '../../../types';
import { passesSemanticFilter } from './semanticFilter';

export function passesPairFilter(
  first: NamingCharacter,
  second: NamingCharacter,
  semantic: SemanticPairAssessment,
  preference?: NamingPreference,
): boolean {
  if (first.char === second.char || !passesSemanticFilter(semantic)) {
    return false;
  }

  const included = preference?.includeCharacters ?? [];
  return included.every((character) =>
    (first.char + second.char).includes(character),
  );
}
