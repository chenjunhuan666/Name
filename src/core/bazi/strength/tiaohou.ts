import { BAZI_STRENGTH_CONFIG } from '../../../config/baziStrength';
import type { BasicTiaohouAnalysis, EarthlyBranch } from '../../../types';

const RULE_ID = 'bazi.tiaohou.basic';

/** V2 月令级基础修正；不参与旺衰分数，也不输出唯一喜用神。 */
export function analyzeBasicTiaohou(
  monthCommand: EarthlyBranch,
): BasicTiaohouAnalysis {
  const config = BAZI_STRENGTH_CONFIG.basicTiaohou[monthCommand];
  const favoredElements = [...config.favoredElements];
  const adjustment = favoredElements.length
    ? BAZI_STRENGTH_CONFIG.basicTiaohouAdjustment
    : 0;
  const direction = favoredElements.length
    ? `基础调节方向为${favoredElements.join('、')}，仅在起名倾向中上调一档`
    : '未触发额外元素调节';

  return {
    monthCommand,
    climate: config.climate,
    favoredElements,
    adjustment,
    reason: `${monthCommand}月在项目基础季节表中归为${config.climate}；${direction}，不改变旺衰证据分。`,
    ruleIds: [RULE_ID],
  };
}
