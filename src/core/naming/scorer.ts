import type {
  ClassicReference,
  ElementTendency,
  HomophoneAssessment,
  NameScoreBreakdown,
  NameScoreDimension,
  NamingCharacter,
  PhoneticAssessment,
} from '../../types';

export const SCORE_WEIGHTS: Record<NameScoreDimension, number> = {
  element: 0.3,
  meaning: 0.2,
  phonetic: 0.15,
  classic: 0.15,
  homophone: 0.1,
  shape: 0.05,
  rarity: 0.05,
};

const ELEMENT_LEVEL_SCORES = [0, 45, 60, 75, 90, 100] as const;

interface ScoreNameOptions {
  characters: [NamingCharacter, NamingCharacter];
  tendencies?: ElementTendency[];
  phonetic: PhoneticAssessment;
  homophone: HomophoneAssessment;
  surnameStrokes: number[];
  classic?: ClassicReference;
}

export interface NameScoringResult {
  score: number;
  scoreBreakdown: NameScoreBreakdown;
  scoreExplanations: Record<NameScoreDimension, string>;
}

function characterElements(character: NamingCharacter) {
  return Array.isArray(character.element)
    ? character.element
    : [character.element];
}

function calculateElementScore(
  characters: [NamingCharacter, NamingCharacter],
  tendencies?: ElementTendency[],
): number {
  if (!tendencies?.length) {
    return 70;
  }

  const tendencyMap = new Map(
    tendencies.map(({ element, level }) => [element, level]),
  );
  const scores = characters.map((character) =>
    Math.max(
      ...characterElements(character).map(
        (element) => ELEMENT_LEVEL_SCORES[tendencyMap.get(element) ?? 3],
      ),
    ),
  );

  return Math.round((scores[0] + scores[1]) / 2);
}

function calculateMeaningScore(
  characters: [NamingCharacter, NamingCharacter],
): number {
  const scores = characters.map((character) => {
    const positiveBasis = character.negative ? 0 : 80;
    const meaningCompleteness = character.meaning.trim().length >= 2 ? 10 : 0;
    const styleCompleteness = character.styleTags.length >= 2 ? 10 : 5;
    return positiveBasis + meaningCompleteness + styleCompleteness;
  });

  return Math.round((scores[0] + scores[1]) / 2);
}

function calculateShapeScore(strokes: number[]): number {
  if (strokes.length < 2) {
    return 75;
  }

  const totalPenalty = strokes.slice(1).reduce((penalty, strokesValue, index) => {
    const difference = Math.abs(strokesValue - strokes[index]);
    return penalty + Math.max(0, difference - 5) * 3;
  }, 0);

  return Math.max(55, Math.round(100 - totalPenalty));
}

function calculateRarityScore(
  characters: [NamingCharacter, NamingCharacter],
): number {
  const averageRarity = (characters[0].rarity + characters[1].rarity) / 2;
  return Math.round(100 - averageRarity * 100);
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scoreName({
  characters,
  tendencies,
  phonetic,
  homophone,
  surnameStrokes,
  classic,
}: ScoreNameOptions): NameScoringResult {
  const element = calculateElementScore(characters, tendencies);
  const meaning = calculateMeaningScore(characters);
  const knownStrokes = [
    ...surnameStrokes,
    ...characters.map(({ strokes }) => strokes),
  ].filter((value): value is number => typeof value === 'number');
  const shape = calculateShapeScore(knownStrokes);
  const rarity = calculateRarityScore(characters);
  const scoreBreakdown: NameScoreBreakdown = {
    element,
    meaning,
    phonetic: phonetic.score,
    classic: classic ? 100 : 0,
    homophone: homophone.score,
    shape,
    rarity,
  };
  const weightedScore = (
    Object.entries(scoreBreakdown) as [NameScoreDimension, number][]
  ).reduce(
    (total, [dimension, dimensionScore]) =>
      total + dimensionScore * SCORE_WEIGHTS[dimension],
    0,
  );
  const elements = characters.flatMap(characterElements).join('、');

  return {
    score: roundToOneDecimal(weightedScore),
    scoreBreakdown,
    scoreExplanations: {
      element: `按当前八字五档倾向评估名字中的${elements}。`,
      meaning: '仅按正向字库准入、字义与风格标注完整度评分。',
      phonetic: phonetic.notes.join(''),
      classic: classic
        ? `名字两字按原顺序连续见于${classic.display}。`
        : '基础典籍语料中未发现名字两字按原顺序连续出现，本项不附会出处。',
      homophone: homophone.safe
        ? '普通话基础负面谐音库未发现精确命中。'
        : `命中：${homophone.matches.join('、')}。`,
      shape: knownStrokes.length >= 2
        ? `按已知笔画 ${knownStrokes.join('-')} 的相邻差异评估。`
        : '已知笔画不足，本项采用中性分。',
      rarity: `两字生僻度为 ${characters.map(({ rarity: value }) => value).join('、')}。`,
    },
  };
}
