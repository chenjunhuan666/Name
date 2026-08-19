import { isJiaZi } from '../../data/sixtyJiaZi';
import type {
  Bazi,
  BaziInputValues,
  EarthlyBranch,
  HeavenlyStem,
  Pillar,
} from '../../types';

export const EMPTY_BAZI_INPUT: BaziInputValues = {
  year: '',
  month: '',
  day: '',
  hour: '',
};

export function parseJiaZi(value: string): Pillar | undefined {
  if (!isJiaZi(value)) {
    return undefined;
  }

  const characters = Array.from(value);

  return {
    stem: characters[0] as HeavenlyStem,
    branch: characters[1] as EarthlyBranch,
  };
}

export function formatPillar(pillar: Pillar): string {
  return `${pillar.stem}${pillar.branch}`;
}

export function baziToInputValues(bazi?: Bazi): BaziInputValues {
  if (!bazi) {
    return { ...EMPTY_BAZI_INPUT };
  }

  return {
    year: formatPillar(bazi.year),
    month: formatPillar(bazi.month),
    day: formatPillar(bazi.day),
    hour: formatPillar(bazi.hour),
  };
}
