import {
  GENERATOR_LIMITS,
  V3_DIVERSITY_LIMITS,
} from '../../../config/namingScore';
import type {
  CharacterPronunciation,
  ClassicReference,
  ClassicWork,
  ElementTendency,
  GeneratedName,
  NamingCharacter,
  NamingPreference,
} from '../../../types';
import { createClassicPhraseIndex } from '../../classics/classicRepository';
import { rerankForDiversity } from '../diversity';
import { passesHomophoneFilter } from '../filters/homophoneFilter';
import { passesPairFilter } from '../filters/pairFilter';
import { assessHomophone } from '../homophone';
import { assessPhonetics } from '../phonetic';
import { scoreName, scoreNameV3 } from '../scorer';
import { assessSemanticPair, assessSemanticPairV3 } from '../semanticPair';
import { scoreNamingCharacter } from './buckets';

export interface PairSearchOptions {
  surname: string;
  characters: readonly NamingCharacter[];
  tendencies?: ElementTendency[];
  pronunciations?: CharacterPronunciation[];
  classicWorks?: ClassicWork[];
  preference?: NamingPreference;
  limit: number;
  beamWidthPerFirst: number;
  rankingModel?: 'v2' | 'v3';
}

export interface PairSearchResult {
  names: GeneratedName[];
  consideredPairCount: number;
  beamCandidateCount: number;
  fullScoreCandidateCount: number;
  retrievedGivenNames: string[];
}

interface BeamCandidate {
  first: NamingCharacter;
  second: NamingCharacter;
  classic?: ClassicReference;
  cheapScore: number;
}

function primaryElements(character: NamingCharacter) {
  return Array.isArray(character.element)
    ? character.element
    : [character.element];
}

function createNameId(fullName: string): string {
  return [...fullName]
    .map((character) => character.codePointAt(0)?.toString(16) ?? '')
    .join('-');
}

function compareNames(left: GeneratedName, right: GeneratedName): number {
  return (
    right.score - left.score ||
    right.scoreBreakdown.phonetic - left.scoreBreakdown.phonetic ||
    right.scoreBreakdown.element - left.scoreBreakdown.element ||
    left.givenName.localeCompare(right.givenName, 'zh-CN')
  );
}

function matchesClassicPreference(
  classic: ClassicReference | undefined,
  preference: NamingPreference['classicPreference'],
): boolean {
  if (!preference || preference === 'none') {
    return true;
  }
  if (!classic) {
    return false;
  }

  const sourceGroups: Record<
    Exclude<NamingPreference['classicPreference'], undefined | 'none'>,
    string[]
  > = {
    shijing: ['shijing'],
    chuci: ['chuci'],
    confucian: ['lunyu', 'mengzi', 'zhouyi'],
    taoist: ['zhuangzi'],
    tang: ['tang'],
    song: ['songci'],
  };
  return sourceGroups[preference].includes(classic.source);
}

export function cheapPairScore(
  first: NamingCharacter,
  second: NamingCharacter,
  semanticScore: number,
  tendencies?: ElementTendency[],
  preference?: NamingPreference,
): number {
  const characterScore =
    scoreNamingCharacter(first, tendencies, preference) +
    scoreNamingCharacter(second, tendencies, preference);
  const toneDifference = first.tone === second.tone ? 0 : 20;
  const styleOverlap = first.styleTags.some((style) =>
    second.styleTags.includes(style),
  )
    ? 10
    : 0;
  return characterScore + semanticScore * 5 + toneDifference + styleOverlap;
}

function buildGeneratedName(
  candidate: BeamCandidate,
  context: {
    surname: string;
    surnamePinyin: string[];
    surnamePronunciations: CharacterPronunciation[];
    surnameStrokes: number[];
    hasCompleteSurnamePronunciation: boolean;
    tendencies?: ElementTendency[];
    rankingModel: 'v2' | 'v3';
  },
): GeneratedName | undefined {
  const { first, second, classic } = candidate;
  const semanticAssessment = context.rankingModel === 'v3'
    ? assessSemanticPairV3(first, second)
    : assessSemanticPair(first, second);
  const givenName = first.char + second.char;
  const givenPinyin = [first.pinyin, second.pinyin];
  const homophoneAssessment = assessHomophone(
    context.surnamePinyin,
    givenPinyin,
  );
  if (!passesHomophoneFilter(homophoneAssessment)) {
    return undefined;
  }
  const phoneticAssessment = assessPhonetics([
    ...context.surnamePronunciations.map(({ pinyin, tone }) => ({
      pinyin,
      tone,
    })),
    { pinyin: first.pinyin, tone: first.tone },
    { pinyin: second.pinyin, tone: second.tone },
  ]);
  if (!context.hasCompleteSurnamePronunciation) {
    phoneticAssessment.notes.push(
      '姓氏读音未完整收录，音律分仅基于已知读音与名字两字。',
    );
  }
  const scoring = (context.rankingModel === 'v3' ? scoreNameV3 : scoreName)({
    characters: [first, second],
    tendencies: context.tendencies,
    phonetic: phoneticAssessment,
    homophone: homophoneAssessment,
    surnameStrokes: context.surnameStrokes,
    classic,
    semantic: semanticAssessment,
  });
  const elements = [...primaryElements(first), ...primaryElements(second)];
  const styleTags = [...new Set([...first.styleTags, ...second.styleTags])];
  const fullName = context.surname + givenName;

  return {
    id: createNameId(fullName),
    surname: context.surname,
    givenName,
    fullName,
    pinyin: [
      context.hasCompleteSurnamePronunciation
        ? context.surnamePinyin.join(' ')
        : context.surname,
      ...givenPinyin,
    ].join(' '),
    tones: [
      ...context.surnamePronunciations.map(({ tone }) => tone),
      first.tone,
      second.tone,
    ],
    elements,
    characters: [first, second],
    meaning: `${first.char}：${first.meaning}；${second.char}：${second.meaning}`,
    styleTags,
    score: scoring.score,
    scoreBreakdown: scoring.scoreBreakdown,
    scoreExplanations: scoring.scoreExplanations,
    phoneticAssessment,
    homophoneAssessment,
    semanticAssessment,
    recommendation: `${elements.join('、')}按当前起名倾向参与匹配；${semanticAssessment.notes[0]}；${phoneticAssessment.notes[0]}普通话基础负面谐音库未发现精确命中。${classic ? `${classic.level} 级文化关联见${classic.display}。` : '当前典籍语料未发现可核对文化关联。'}`,
    classic,
  };
}

export function searchNamePairs({
  surname,
  characters,
  tendencies,
  pronunciations = [],
  classicWorks = [],
  preference,
  limit,
  beamWidthPerFirst,
  rankingModel = 'v2',
}: PairSearchOptions): PairSearchResult {
  const normalizedSurname = surname.trim();
  const safeBeamWidth = Math.max(1, Math.floor(beamWidthPerFirst));
  const pronunciationMap = new Map(
    pronunciations.map((item) => [item.char, item]),
  );
  const classicPhraseIndex = createClassicPhraseIndex(classicWorks);
  const surnamePronunciations = [...normalizedSurname]
    .map((character) => pronunciationMap.get(character))
    .filter((item): item is CharacterPronunciation => Boolean(item));
  const surnamePinyin = surnamePronunciations.map(({ pinyin }) => pinyin);
  const surnameStrokes = surnamePronunciations
    .map(({ strokes }) => strokes)
    .filter((value): value is number => typeof value === 'number');
  const hasCompleteSurnamePronunciation =
    surnamePronunciations.length === [...normalizedSurname].length;
  const beam: BeamCandidate[] = [];
  let consideredPairCount = 0;

  for (const first of characters) {
    const perFirst: BeamCandidate[] = [];
    for (const second of characters) {
      consideredPairCount += 1;
      const semantic = rankingModel === 'v3'
        ? assessSemanticPairV3(first, second)
        : assessSemanticPair(first, second);
      if (!passesPairFilter(first, second, semantic, preference)) {
        continue;
      }
      const givenName = first.char + second.char;
      const classic = classicPhraseIndex.get(givenName);
      if (!matchesClassicPreference(classic, preference?.classicPreference)) {
        continue;
      }
      perFirst.push({
        first,
        second,
        classic,
        cheapScore: cheapPairScore(
          first,
          second,
          semantic.score,
          tendencies,
          preference,
        ),
      });
    }
    perFirst
      .sort(
        (left, right) =>
          right.cheapScore - left.cheapScore ||
          left.second.char.localeCompare(right.second.char, 'zh-CN'),
      )
      .slice(0, safeBeamWidth)
      .forEach((candidate) => beam.push(candidate));
  }

  const generated: GeneratedName[] = [];
  const retainedCapacity = Math.max(
    limit * GENERATOR_LIMITS.retainedBufferFactor,
    limit,
  );
  for (const candidate of beam) {
    const name = buildGeneratedName(candidate, {
      surname: normalizedSurname,
      surnamePinyin,
      surnamePronunciations,
      surnameStrokes,
      hasCompleteSurnamePronunciation,
      tendencies,
      rankingModel,
    });
    if (name) {
      generated.push(name);
    }
    if (
      generated.length >=
      retainedCapacity * GENERATOR_LIMITS.compactionTriggerFactor
    ) {
      generated.sort(compareNames).splice(retainedCapacity);
    }
  }

  const sorted = generated.sort(compareNames).slice(0, retainedCapacity);
  return {
    names: rerankForDiversity(
      sorted,
      limit,
      rankingModel === 'v3' ? V3_DIVERSITY_LIMITS : undefined,
    ),
    consideredPairCount,
    beamCandidateCount: beam.length,
    fullScoreCandidateCount: beam.length,
    retrievedGivenNames: beam.map(
      ({ first, second }) => first.char + second.char,
    ),
  };
}
