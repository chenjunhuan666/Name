import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import type { HiddenStemRole } from '../../../types';

export function hiddenStemPowerLevel(
  role: HiddenStemRole,
): 1 | 2 | 3 | 4 | 5 {
  return BAZI_STRENGTH_CONFIG.hiddenStemRoleLevel[role];
}

export function hiddenResourceLevel(
  role: HiddenStemRole,
): 1 | 2 | 3 | 4 | 5 {
  return BAZI_STRENGTH_CONFIG.hiddenResourceLevel[role];
}
