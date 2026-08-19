import {
  CONTROLLING_CYCLE,
  FIVE_ELEMENTS,
  GENERATING_CYCLE,
} from '../../data/fiveElements';
import type {
  Bazi,
  BaziStrength,
  BaziStrengthAnalysis,
  CompleteBaziAnalysis,
  ElementRelation,
  ElementTendency,
  FiveElement,
  FiveElementDistribution,
  PillarKey,
} from '../../types';
import { analyzeBasicBazi } from './basicAnalysis';

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];
const SURFACE_WEIGHT = 1;
const HIDDEN_STEM_WEIGHT = 0.5;
const MONTH_COMMAND_BONUS = 1.5;
const WEAK_SUPPORT_RATIO = 0.42;
const STRONG_SUPPORT_RATIO = 0.58;

const BASE_TENDENCY: Record<
  BaziStrength,
  Record<ElementRelation, 1 | 2 | 3 | 4 | 5>
> = {
  偏弱: {
    同类: 4,
    生扶日主: 5,
    日主所生: 2,
    制约日主: 1,
    日主所制: 1,
  },
  中和: {
    同类: 3,
    生扶日主: 3,
    日主所生: 4,
    制约日主: 3,
    日主所制: 3,
  },
  偏旺: {
    同类: 1,
    生扶日主: 1,
    日主所生: 5,
    制约日主: 4,
    日主所制: 3,
  },
};

const RELATION_GUIDANCE: Record<
  BaziStrength,
  Record<ElementRelation, string>
> = {
  偏弱: {
    同类: '日主偏弱时，同类元素可作为基础扶助方向',
    生扶日主: '日主偏弱时，能生扶日主的元素优先用于补充支持',
    日主所生: '日主偏弱时，日主所生的元素会继续疏泄力量',
    制约日主: '日主偏弱时，制约日主的元素不作为优先方向',
    日主所制: '日主偏弱时，日主所制的元素会增加消耗',
  },
  中和: {
    同类: '日主中和时，同类元素保持中性参考',
    生扶日主: '日主中和时，生扶元素保持中性参考',
    日主所生: '日主中和时，日主所生的元素可用于温和疏导',
    制约日主: '日主中和时，制约日主的元素可用于维持平衡',
    日主所制: '日主中和时，日主所制的元素可作为辅助方向',
  },
  偏旺: {
    同类: '日主偏旺时，同类元素会继续增加同类力量',
    生扶日主: '日主偏旺时，生扶日主的元素不作为优先方向',
    日主所生: '日主偏旺时，日主所生的元素可用于疏导力量',
    制约日主: '日主偏旺时，制约日主的元素可用于形成制衡',
    日主所制: '日主偏旺时，日主所制的元素可承担部分消耗',
  },
};

function createEmptyDistribution(): FiveElementDistribution {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
}

function addWeight(
  distribution: FiveElementDistribution,
  element: FiveElement,
  weight: number,
): void {
  distribution[element] += weight;
}

function getElementRelation(
  element: FiveElement,
  dayMasterElement: FiveElement,
): ElementRelation {
  if (element === dayMasterElement) {
    return '同类';
  }

  if (GENERATING_CYCLE[element] === dayMasterElement) {
    return '生扶日主';
  }

  if (GENERATING_CYCLE[dayMasterElement] === element) {
    return '日主所生';
  }

  if (CONTROLLING_CYCLE[element] === dayMasterElement) {
    return '制约日主';
  }

  return '日主所制';
}

function calculateWeightedElements(
  analysis: ReturnType<typeof analyzeBasicBazi>,
): FiveElementDistribution {
  const weightedElements = createEmptyDistribution();

  PILLAR_KEYS.forEach((key) => {
    const pillar = analysis.pillars[key];

    addWeight(weightedElements, pillar.stemElement, SURFACE_WEIGHT);
    addWeight(weightedElements, pillar.branchElement, SURFACE_WEIGHT);
    pillar.hiddenStems.forEach(({ element }) => {
      addWeight(weightedElements, element, HIDDEN_STEM_WEIGHT);
    });
  });

  addWeight(
    weightedElements,
    analysis.pillars.month.branchElement,
    MONTH_COMMAND_BONUS,
  );

  return weightedElements;
}

function resolveStrength(supportRatio: number): BaziStrength {
  if (supportRatio <= WEAK_SUPPORT_RATIO) {
    return '偏弱';
  }

  if (supportRatio >= STRONG_SUPPORT_RATIO) {
    return '偏旺';
  }

  return '中和';
}

function clampLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5;
}

function createNamingTendencies(
  strength: BaziStrength,
  dayMasterElement: FiveElement,
  weightedElements: FiveElementDistribution,
  totalWeight: number,
): ElementTendency[] {
  const averageWeight = totalWeight / FIVE_ELEMENTS.length;

  return FIVE_ELEMENTS.map((element) => {
    const relation = getElementRelation(element, dayMasterElement);
    const baseLevel = BASE_TENDENCY[strength][relation];
    const weightedPresence = weightedElements[element];
    const isScarce = weightedPresence <= averageWeight * 0.5;
    const isConcentrated = weightedPresence >= averageWeight * 1.5;
    const scarcityAdjustment = isScarce && baseLevel >= 3 ? 1 : 0;
    const concentrationAdjustment = isConcentrated ? -1 : 0;
    const level = clampLevel(
      baseLevel + scarcityAdjustment + concentrationAdjustment,
    );
    const distributionReason = scarcityAdjustment
      ? '该元素在当前加权结构中相对偏少，倾向上调一档'
      : concentrationAdjustment
        ? '该元素在当前加权结构中相对集中，倾向下调一档'
        : '当前占比未触发稀少或集中修正';

    return {
      element,
      level,
      relation,
      weightedPresence,
      reason: `${RELATION_GUIDANCE[strength][relation]}；${distributionReason}。`,
    };
  }).sort(
    (left, right) =>
      right.level - left.level ||
      FIVE_ELEMENTS.indexOf(left.element) - FIVE_ELEMENTS.indexOf(right.element),
  );
}

function analyzeStrength(
  analysis: ReturnType<typeof analyzeBasicBazi>,
): BaziStrengthAnalysis {
  const weightedElements = calculateWeightedElements(analysis);
  const totalWeight = Object.values(weightedElements).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  const dayMasterElement = analysis.dayMaster.element;
  const supportiveElements = FIVE_ELEMENTS.filter((element) => {
    const relation = getElementRelation(element, dayMasterElement);
    return relation === '同类' || relation === '生扶日主';
  });
  const supportWeight = supportiveElements.reduce(
    (sum, element) => sum + weightedElements[element],
    0,
  );
  const regulatingWeight = totalWeight - supportWeight;
  const rawSupportRatio = supportWeight / totalWeight;
  const supportRatio = Math.round(rawSupportRatio * 100);
  const strength = resolveStrength(rawSupportRatio);
  const monthCommandElement = analysis.pillars.month.branchElement;

  return {
    strength,
    strengthBreakdown: {
      weightedElements,
      supportWeight,
      regulatingWeight,
      totalWeight,
      supportRatio,
      monthCommandElement,
    },
    strengthReason: `V1 加权模型中，生扶日主的${supportiveElements.join('、')}合计 ${supportWeight}/${totalWeight}（${supportRatio}%）；月令${analysis.monthCommand}${monthCommandElement}额外计入 ${MONTH_COMMAND_BONUS} 权重，因此基础判断为${strength}。`,
    namingTendencies: createNamingTendencies(
      strength,
      dayMasterElement,
      weightedElements,
      totalWeight,
    ),
  };
}

export function analyzeBazi(bazi: Bazi): CompleteBaziAnalysis {
  const basicAnalysis = analyzeBasicBazi(bazi);

  return {
    ...basicAnalysis,
    ...analyzeStrength(basicAnalysis),
  };
}
