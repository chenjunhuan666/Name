import type {
  ClassicReference,
  ElementTendency,
  HomophoneAssessment,
  NameScoreBreakdown,
  NameScoreDimension,
  NamingCharacter,
  PhoneticAssessment,
  SemanticPairAssessment,
} from '../../types';
import {
  CLASSIC_LEVEL_SCORES,
  ELEMENT_SCORE,
  ELEMENT_LEVEL_SCORES,
  MEANING_SCORE,
  MODERN_AESTHETIC_SCORE,
  NAMING_SCORE_WEIGHTS,
  RARITY_SCORE,
  SCORE_ROUNDING_FACTOR,
  SEMANTIC_ROLE_CALIBRATION,
  SHAPE_SCORE,
} from '../../config/namingScore';

interface ScoreNameOptions {
  characters: [NamingCharacter, NamingCharacter];
  tendencies?: ElementTendency[];
  phonetic: PhoneticAssessment;
  homophone: HomophoneAssessment;
  surnameStrokes: number[];
  classic?: ClassicReference;
  semantic?: SemanticPairAssessment;
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
    return ELEMENT_SCORE.fallback;
  }

  const tendencyMap = new Map(
    tendencies.map(({ element, level }) => [element, level]),
  );
  const scores = characters.map((character) =>
    Math.max(
      ...characterElements(character).map(
        (element) =>
          ELEMENT_LEVEL_SCORES[
            tendencyMap.get(element) ?? ELEMENT_SCORE.defaultTendencyLevel
          ],
      ),
    ),
  );

  return Math.round((scores[0] + scores[1]) / 2);
}

function calculateMeaningScore(
  characters: [NamingCharacter, NamingCharacter],
  semantic?: SemanticPairAssessment,
): number {
  const scores = characters.map((character) => {
    const positiveBasis = character.negative
      ? MEANING_SCORE.negativeBase
      : MEANING_SCORE.positiveBase;
    const meaningCompleteness =
      character.meaning.trim().length >= MEANING_SCORE.minimumMeaningLength
        ? MEANING_SCORE.meaningCompletenessBonus
        : 0;
    const styleCompleteness =
      character.styleTags.length >= MEANING_SCORE.richStyleMinimumCount
        ? MEANING_SCORE.richStyleBonus
        : MEANING_SCORE.basicStyleBonus;
    return positiveBasis + meaningCompleteness + styleCompleteness;
  });

  const characterScore = (scores[0] + scores[1]) / 2;
  return Math.round(
    semantic
      ? characterScore * MEANING_SCORE.characterWeight +
          semantic.score * MEANING_SCORE.semanticWeight
      : characterScore,
  );
}

function calculateShapeScore(strokes: number[]): number {
  if (strokes.length < 2) {
    return SHAPE_SCORE.neutral;
  }

  const totalPenalty = strokes.slice(1).reduce((penalty, strokesValue, index) => {
    const difference = Math.abs(strokesValue - strokes[index]);
    return (
      penalty +
      Math.max(0, difference - SHAPE_SCORE.freeStrokeDifference) *
        SHAPE_SCORE.penaltyPerExtraStroke
    );
  }, 0);

  return Math.max(
    SHAPE_SCORE.minimum,
    Math.round(SHAPE_SCORE.maximum - totalPenalty),
  );
}

function calculateRarityScore(
  characters: [NamingCharacter, NamingCharacter],
): number {
  const averageRarity = (characters[0].rarity + characters[1].rarity) / 2;
  return Math.round(
    RARITY_SCORE.maximum - averageRarity * RARITY_SCORE.scale,
  );
}

function roundToOneDecimal(value: number): number {
  return (
    Math.round(value * SCORE_ROUNDING_FACTOR) / SCORE_ROUNDING_FACTOR
  );
}

function calculateClassicScore(classic?: ClassicReference): number {
  return classic && (!classic.level || classic.level === 'A')
    ? CLASSIC_LEVEL_SCORES.A
    : classic?.level === 'B'
      ? CLASSIC_LEVEL_SCORES.B
      : classic?.level === 'C'
        ? CLASSIC_LEVEL_SCORES.C
        : 0;
}

function calculateModernScore(
  semantic?: SemanticPairAssessment,
  useSemanticRoles = false,
  roleScale = 1,
): number {
  if (!semantic) {
    return MODERN_AESTHETIC_SCORE.base;
  }

  const roleAdjustment = (!useSemanticRoles
    ? 0
    : semantic.roleRelation === 'coherent'
      ? MODERN_AESTHETIC_SCORE.coherentRoleBonus
      : semantic.roleRelation === 'repetitive'
        ? -MODERN_AESTHETIC_SCORE.repetitiveRolePenalty
        : semantic.roleRelation === 'fragment'
          ? -MODERN_AESTHETIC_SCORE.fragmentRolePenalty
          : semantic.roleRelation === 'conflicting'
            ? -MODERN_AESTHETIC_SCORE.conflictingRolePenalty
            : 0) * roleScale;
  const score =
    MODERN_AESTHETIC_SCORE.base +
    (semantic.natural ? MODERN_AESTHETIC_SCORE.naturalBonus : 0) +
    (semantic.completeImage ? MODERN_AESTHETIC_SCORE.completeImageBonus : 0) +
    (semantic.styleConsistency
      ? MODERN_AESTHETIC_SCORE.styleConsistencyBonus
      : 0) -
    (semantic.overlyPopular
      ? MODERN_AESTHETIC_SCORE.overlyPopularPenalty
      : 0) -
    (semantic.overlyWebNovel
      ? MODERN_AESTHETIC_SCORE.overlyWebNovelPenalty
      : 0) +
    roleAdjustment;

  return Math.min(
    MODERN_AESTHETIC_SCORE.maximum,
    Math.max(MODERN_AESTHETIC_SCORE.minimum, score),
  );
}

function scoreNameInternal({
  characters,
  tendencies,
  phonetic,
  homophone,
  surnameStrokes,
  classic,
  semantic,
}: ScoreNameOptions, useSemanticRoles: boolean, roleScale: number): NameScoringResult {
  const element = calculateElementScore(characters, tendencies);
  const meaning = calculateMeaningScore(characters, semantic);
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
    classic: calculateClassicScore(classic),
    homophone: homophone.score,
    modern: calculateModernScore(semantic, useSemanticRoles, roleScale),
    shape,
    rarity,
  };
  const weightedScore = (
    Object.entries(NAMING_SCORE_WEIGHTS) as [NameScoreDimension, number][]
  ).reduce(
    (total, [dimension, weight]) =>
      total + (scoreBreakdown[dimension] ?? 0) * weight,
    0,
  );
  const elements = characters.flatMap(characterElements).join('、');

  return {
    score: roundToOneDecimal(weightedScore),
    scoreBreakdown,
    scoreExplanations: {
      element: `按当前八字五档倾向评估名字中的${elements}。`,
      meaning: semantic
        ? `结合单字正向准入和组合语义评估：${semantic.notes.join('；')}。`
        : '仅按正向字库准入、字义与风格标注完整度评分。',
      phonetic: phonetic.notes.join(''),
      classic: classic
        ? `${classic.explanation ?? '名字与原文建立了可核对关联'}出处等级 ${classic.level ?? 'A'}，见${classic.display}。`
        : '当前典籍语料中未发现 A/B 级原文关联或经人工登记的 C 级意象关联，本项不附会出处。',
      homophone: homophone.safe
        ? homophone.matches.length
          ? `未命中硬性负面谐音，但存在近音提示：${homophone.matches.join('、')}。`
          : '完整姓名、名字两字及姓与首字均未命中普通话负面谐音。'
        : `命中：${homophone.matches.join('、')}。`,
      modern: semantic
        ? `按姓名自然度、完整意象、风格一致性和流行度评估：${semantic.notes.join('；')}。`
        : '组合语义信息不足，现代审美采用中性基准分。',
      shape: knownStrokes.length >= 2
        ? `按已知笔画 ${knownStrokes.join('-')} 的相邻差异评估。`
        : '已知笔画不足，本项采用中性分。',
      rarity: `两字生僻度为 ${characters.map(({ rarity: value }) => value).join('、')}。`,
    },
  };
}

export function scoreName(options: ScoreNameOptions): NameScoringResult {
  return scoreNameInternal(options, false, 0);
}

export function scoreNameV3(
  options: ScoreNameOptions,
  roleScale = SEMANTIC_ROLE_CALIBRATION.roleScale,
): NameScoringResult {
  return scoreNameInternal(options, true, roleScale);
}
