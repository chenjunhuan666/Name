import type { NamingStyle } from '../types';

export const NAMING_STYLE_OPTIONS: readonly NamingStyle[] = [
  '清雅',
  '大气',
  '儒雅',
  '温润',
  '自然',
  '书卷',
  '古典',
  '简约',
  '中性',
];

const SOURCE_STYLE_TO_V2: Readonly<Record<string, NamingStyle>> = {
  清雅: '清雅',
  书卷: '书卷',
  刚健: '大气',
  富贵: '大气',
  坚定: '大气',
  沉稳: '儒雅',
  文雅: '儒雅',
  勤勉: '儒雅',
  温婉: '温润',
  温润: '温润',
  圆满: '温润',
  明朗: '自然',
  灵动: '自然',
  清脆: '自然',
  仙气: '古典',
  古典: '古典',
  质朴: '简约',
  中性: '中性',
};

/** 将来源标签归一到 V2 对外九类；未知标签保守归入中性。 */
export function normalizeNamingStyles(
  sourceStyles: readonly string[],
): NamingStyle[] {
  const normalized = sourceStyles.map(
    (style) => SOURCE_STYLE_TO_V2[style] ?? '中性',
  );
  return [...new Set(normalized)];
}
