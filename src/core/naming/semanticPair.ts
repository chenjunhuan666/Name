import {
  FORBIDDEN_GIVEN_NAMES,
  HIGH_FREQUENCY_NAMING_CHARACTERS,
  SEMANTIC_CONFLICT_PAIRS,
  WEB_NOVEL_STYLE_CHARACTERS,
  WEB_NOVEL_STYLE_GIVEN_NAMES,
} from '../../data/namingConstraints';
import { SEMANTIC_PAIR_SCORE } from '../../config/namingScore';
import { SEMANTIC_ROLE_CALIBRATION } from '../../config/namingScore';
import type { NamingCharacter, SemanticPairAssessment } from '../../types';
import {
  assessSemanticRoleRelation,
  inferSemanticRoles,
} from '../../data/semanticRoles';

function normalizedMeaning(meaning: string): string {
  return meaning.replace(/[\s，。；、]/g, '');
}

function hasSemanticConflict(first: string, second: string): boolean {
  return SEMANTIC_CONFLICT_PAIRS.some(
    ([left, right]) =>
      (first === left && second === right) ||
      (first === right && second === left),
  );
}

export function assessSemanticPair(
  first: NamingCharacter,
  second: NamingCharacter,
): SemanticPairAssessment {
  const givenName = first.char + second.char;
  const sharedStyles = first.styleTags.filter((style) =>
    second.styleTags.includes(style),
  );
  const repeatedMeaning =
    normalizedMeaning(first.meaning) === normalizedMeaning(second.meaning);
  const conflict = hasSemanticConflict(first.char, second.char);
  const forbidden = FORBIDDEN_GIVEN_NAMES.has(givenName);
  const overlyPopular = [first.char, second.char].every((character) =>
    HIGH_FREQUENCY_NAMING_CHARACTERS.has(character),
  );
  const overlyWebNovel =
    WEB_NOVEL_STYLE_GIVEN_NAMES.has(givenName) ||
    [first.char, second.char].every((character) =>
      WEB_NOVEL_STYLE_CHARACTERS.has(character),
    );
  const styleConsistency = sharedStyles.length > 0;
  const completeImage =
    !repeatedMeaning &&
    !conflict &&
    first.meaning.trim().length >= SEMANTIC_PAIR_SCORE.minimumMeaningLength &&
    second.meaning.trim().length >= SEMANTIC_PAIR_SCORE.minimumMeaningLength;
  const nameLike =
    completeImage && first.styleTags.length > 0 && second.styleTags.length > 0;
  const natural =
    !forbidden &&
    !conflict &&
    !first.negative &&
    !second.negative &&
    nameLike;
  const score = Math.max(
    SEMANTIC_PAIR_SCORE.minimum,
    SEMANTIC_PAIR_SCORE.base +
      (styleConsistency ? SEMANTIC_PAIR_SCORE.styleConsistencyBonus : 0) +
      (completeImage ? SEMANTIC_PAIR_SCORE.completeImageBonus : 0) -
      (repeatedMeaning ? SEMANTIC_PAIR_SCORE.repeatedMeaningPenalty : 0) -
      (overlyPopular ? SEMANTIC_PAIR_SCORE.overlyPopularPenalty : 0) -
      (overlyWebNovel ? SEMANTIC_PAIR_SCORE.overlyWebNovelPenalty : 0) -
      (natural ? 0 : SEMANTIC_PAIR_SCORE.unnaturalPenalty),
  );
  const notes = [
    natural ? '未命中明确负面或冲突组合' : '命中明确负面或冲突组合',
    styleConsistency
      ? `共同风格：${sharedStyles.join('、')}`
      : '两字暂无共同风格标签',
    repeatedMeaning ? '两字字义标注高度重复' : '两字字义标注无明显重复',
    overlyPopular
      ? '两字均属项目高频起名字，降低现代差异度'
      : '未命中双高频字组合',
    overlyWebNovel
      ? '命中项目网络文学风格启发式，仅作软降分'
      : '未命中项目网络文学风格启发式',
  ];

  return {
    score,
    natural,
    completeImage,
    styleConsistency,
    overlyPopular,
    overlyWebNovel,
    nameLike,
    notes,
  };
}

export function assessSemanticPairV3(
  first: NamingCharacter,
  second: NamingCharacter,
  roleScale = SEMANTIC_ROLE_CALIBRATION.roleScale,
): SemanticPairAssessment {
  const legacy = assessSemanticPair(first, second);
  const semanticRoles: [
    ReturnType<typeof inferSemanticRoles>,
    ReturnType<typeof inferSemanticRoles>,
  ] = [inferSemanticRoles(first), inferSemanticRoles(second)];
  const roleRelation = assessSemanticRoleRelation(
    semanticRoles[0],
    semanticRoles[1],
  );
  const adjustment =
    roleRelation === 'coherent'
      ? SEMANTIC_PAIR_SCORE.coherentRoleBonus
      : roleRelation === 'repetitive'
        ? -SEMANTIC_PAIR_SCORE.repetitiveRolePenalty
        : roleRelation === 'fragment'
          ? -SEMANTIC_PAIR_SCORE.fragmentRolePenalty
          : roleRelation === 'conflicting'
            ? -SEMANTIC_PAIR_SCORE.conflictingRolePenalty
            : 0;
  const relationNotes = {
    coherent: '语义角色形成可解释的完整关系',
    neutral: '语义角色未形成明确加分或冲突',
    repetitive: '两字语义角色接近，轻度降低区分度',
    fragment: '语义角色更像数量、称谓或动作残句，仅作软降分',
    conflicting: '语义角色存在明显气质或物象冲突，仅作软降分',
  } as const;

  return {
    ...legacy,
    score: Math.max(
      legacy.natural ? SEMANTIC_PAIR_SCORE.filterMinimum : SEMANTIC_PAIR_SCORE.minimum,
      Math.min(100, legacy.score + adjustment * roleScale),
    ),
    semanticRoles,
    roleRelation,
    notes: [...legacy.notes, relationNotes[roleRelation]],
  };
}
