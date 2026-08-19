import { parseJiaZi } from '../bazi/ganzhi';
import type { Bazi, BaziInputValues, Pillar, PillarKey } from '../../types';

export const PILLAR_LABELS: Record<PillarKey, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '时柱',
};

export type BaziInputErrors = Partial<Record<PillarKey, string>>;

export type BaziValidationResult =
  | { isValid: true; bazi: Bazi }
  | { isValid: false; errors: BaziInputErrors };

function validatePillar(
  key: PillarKey,
  value: string,
  errors: BaziInputErrors,
): Pillar | undefined {
  if (!value) {
    errors[key] = `请选择${PILLAR_LABELS[key]}`;
    return undefined;
  }

  const pillar = parseJiaZi(value);

  if (!pillar) {
    errors[key] = `${PILLAR_LABELS[key]}必须是合法六十甲子`;
  }

  return pillar;
}

export function validateBaziInput(
  values: BaziInputValues,
): BaziValidationResult {
  const errors: BaziInputErrors = {};
  const year = validatePillar('year', values.year, errors);
  const month = validatePillar('month', values.month, errors);
  const day = validatePillar('day', values.day, errors);
  const hour = validatePillar('hour', values.hour, errors);

  if (!year || !month || !day || !hour) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    bazi: { year, month, day, hour },
  };
}
