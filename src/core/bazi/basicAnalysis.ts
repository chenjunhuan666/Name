import { EARTHLY_BRANCHES } from '../../data/earthlyBranches';
import { HEAVENLY_STEMS } from '../../data/heavenlyStems';
import type {
  Bazi,
  BaziAnalysis,
  FiveElement,
  FiveElementDistribution,
  Pillar,
  PillarAnalysis,
  PillarKey,
} from '../../types';

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];

function createEmptyDistribution(): FiveElementDistribution {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
}

function incrementElement(
  distribution: FiveElementDistribution,
  element: FiveElement,
): void {
  distribution[element] += 1;
}

function analyzePillar(pillar: Pillar): PillarAnalysis {
  const stemInfo = HEAVENLY_STEMS[pillar.stem];
  const branchInfo = EARTHLY_BRANCHES[pillar.branch];

  return {
    stemElement: stemInfo.element,
    stemYinYang: stemInfo.yinYang,
    branchElement: branchInfo.element,
    branchYinYang: branchInfo.yinYang,
    hiddenStems: branchInfo.hiddenStems.map(({ stem, role }) => ({
      stem,
      role,
      element: HEAVENLY_STEMS[stem].element,
      yinYang: HEAVENLY_STEMS[stem].yinYang,
    })),
  };
}

export function analyzeBasicBazi(bazi: Bazi): BaziAnalysis {
  const pillars: Record<PillarKey, PillarAnalysis> = {
    year: analyzePillar(bazi.year),
    month: analyzePillar(bazi.month),
    day: analyzePillar(bazi.day),
    hour: analyzePillar(bazi.hour),
  };
  const surfaceElements = createEmptyDistribution();
  const hiddenElements = createEmptyDistribution();

  PILLAR_KEYS.forEach((key) => {
    const detail = pillars[key];

    incrementElement(surfaceElements, detail.stemElement);
    incrementElement(surfaceElements, detail.branchElement);
    detail.hiddenStems.forEach(({ element }) => {
      incrementElement(hiddenElements, element);
    });
  });

  const dayStemInfo = HEAVENLY_STEMS[bazi.day.stem];

  return {
    dayMaster: {
      stem: bazi.day.stem,
      element: dayStemInfo.element,
      yinYang: dayStemInfo.yinYang,
    },
    monthCommand: bazi.month.branch,
    surfaceElements,
    hiddenElements,
    pillars,
  };
}
