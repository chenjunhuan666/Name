import type { TenGodOccurrence } from '../../../types';

const PILLAR_LABELS = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '时柱',
} as const;

const HIDDEN_ROLE_LABELS = {
  main: '主气',
  middle: '中气',
  residual: '余气',
} as const;

export function explainTenGodOccurrence(
  occurrence: TenGodOccurrence,
): string {
  const position =
    occurrence.location === 'stem'
      ? `${PILLAR_LABELS[occurrence.pillar]}天干`
      : `${PILLAR_LABELS[occurrence.pillar]}地支${HIDDEN_ROLE_LABELS[occurrence.hiddenRole ?? 'main']}`;

  return `${position}${occurrence.stem}相对日主映射为${occurrence.tenGod}。这里只记录五行生克与阴阳同异形成的传统结构，不作吉凶或现实命运判断。`;
}
