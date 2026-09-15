import type { NamingCharacter, NamingPreference } from '../../../types';
import { RARITY_LIMITS } from '../../../config/namingScore';

const MAX_RARITY: Record<NamingPreference['rarityPreference'], number> =
  RARITY_LIMITS;

export function passesRarityFilter(
  character: NamingCharacter,
  preference?: NamingPreference,
): boolean {
  const maximum = preference
    ? MAX_RARITY[preference.rarityPreference]
    : RARITY_LIMITS.default;
  return character.rarity <= maximum;
}
