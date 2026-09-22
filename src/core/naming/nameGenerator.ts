import type {
  CharacterPronunciation,
  ClassicReference,
  ClassicWork,
  ElementTendency,
  GeneratedName,
  NamingCharacter,
  NamingPreference,
} from '../../types';
import {
  CHARACTER_RANK_SCORE,
  GENERATOR_LIMITS,
} from '../../config/namingScore';
import { createClassicPhraseIndex } from '../classics/classicRepository';
import { rerankForDiversity } from './diversity';
import { filterCharacterPool } from './filters/characterFilter';
import { passesHomophoneFilter } from './filters/homophoneFilter';
import { passesPairFilter } from './filters/pairFilter';
import { assessHomophone } from './homophone';
import { assessPhonetics } from './phonetic';
import { scoreName } from './scorer';
import { assessSemanticPair } from './semanticPair';

export interface GenerateNamesOptions {
  surname: string;
  characters: NamingCharacter[];
  tendencies?: ElementTendency[];
  pronunciations?: CharacterPronunciation[];
  classicWorks?: ClassicWork[];
  preference?: NamingPreference;
  limit?: number;
}

function createNameId(fullName: string): string {
  return [...fullName]
    .map((character) => character.codePointAt(0)?.toString(16) ?? '')
    .join('-');
}

function primaryElements(character: NamingCharacter) {
  return Array.isArray(character.element)
    ? character.element
    : [character.element];
}

export function rankNamingCharacters(
  characters: readonly NamingCharacter[],
  tendencies?: ElementTendency[],
  preference?: NamingPreference,
): NamingCharacter[] {
  const tendencyMap = new Map(
    tendencies?.map(({ element, level }) => [element, level]) ?? [],
  );
  const preferredStyles = new Set(preference?.styles ?? []);
  const included = new Set(preference?.includeCharacters ?? []);

  function score(character: NamingCharacter): number {
    const elementScore = Math.max(
      ...primaryElements(character).map(
        (element) =>
          tendencyMap.get(element) ?? CHARACTER_RANK_SCORE.defaultElementLevel,
      ),
    );
    const styleScore = character.styleTags.filter((style) =>
      preferredStyles.has(style as NamingPreference['styles'][number]),
    ).length;
    const genderScore =
      !preference ||
      preference.genderExpression === 'neutral' ||
      character.gender === 'neutral' ||
      (preference.genderExpression === 'masculine' &&
        character.gender === 'male') ||
      (preference.genderExpression === 'feminine' &&
        character.gender === 'female')
        ? 1
        : 0;

    return (
      elementScore * CHARACTER_RANK_SCORE.elementMultiplier +
      styleScore * CHARACTER_RANK_SCORE.styleMatchBonus +
      genderScore * CHARACTER_RANK_SCORE.genderMatchBonus +
      (included.has(character.char)
        ? CHARACTER_RANK_SCORE.includedCharacterBonus
        : 0) -
      character.rarity * CHARACTER_RANK_SCORE.rarityPenaltyMultiplier
    );
  }

  return [...characters].sort(
    (left, right) =>
      score(right) - score(left) ||
      left.char.localeCompare(right.char, 'zh-CN'),
  );
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

export function generateNames({
  surname,
  characters,
  tendencies,
  pronunciations = [],
  classicWorks = [],
  preference,
  limit = GENERATOR_LIMITS.defaultResultLimit,
}: GenerateNamesOptions): GeneratedName[] {
  const normalizedSurname = surname.trim();
  if (
    !normalizedSurname ||
    characters.length < GENERATOR_LIMITS.minimumCharacterPool ||
    limit <= 0
  ) {
    return [];
  }

  const pronunciationMap = new Map(
    pronunciations.map((item) => [item.char, item]),
  );
  const classicPhraseIndex = createClassicPhraseIndex(classicWorks);
  const surnamePronunciations = [...normalizedSurname]
    .map((character) => pronunciationMap.get(character))
    .filter((item): item is CharacterPronunciation => Boolean(item));
  const hasCompleteSurnamePronunciation =
    surnamePronunciations.length === [...normalizedSurname].length;
  const surnamePinyin = surnamePronunciations.map(({ pinyin }) => pinyin);
  const surnameStrokes = surnamePronunciations
    .map(({ strokes }) => strokes)
    .filter((value): value is number => typeof value === 'number');
  const eligibleCharacters = filterCharacterPool(characters, preference);
  const rankedCharacters = rankNamingCharacters(
    eligibleCharacters,
    tendencies,
    preference,
  );
  const firstPool = rankedCharacters.slice(0, GENERATOR_LIMITS.firstCharacterTopK);
  const secondPool = rankedCharacters.slice(0, GENERATOR_LIMITS.secondCharacterTopK);
  const generated: GeneratedName[] = [];
  const retainedCapacity = Math.max(
    limit * GENERATOR_LIMITS.retainedBufferFactor,
    limit,
  );

  firstPool.forEach((firstCharacter) => {
    secondPool.forEach((secondCharacter) => {
      const semanticAssessment = assessSemanticPair(
        firstCharacter,
        secondCharacter,
      );
      if (
        !passesPairFilter(
          firstCharacter,
          secondCharacter,
          semanticAssessment,
          preference,
        )
      ) {
        return;
      }

      const givenName = firstCharacter.char + secondCharacter.char;
      const fullName = normalizedSurname + givenName;
      const classic = classicPhraseIndex.get(givenName);
      if (!matchesClassicPreference(classic, preference?.classicPreference)) {
        return;
      }

      const givenPinyin = [firstCharacter.pinyin, secondCharacter.pinyin];
      const homophoneAssessment = assessHomophone(surnamePinyin, givenPinyin);
      if (!passesHomophoneFilter(homophoneAssessment)) {
        return;
      }

      const phoneticAssessment = assessPhonetics([
        ...surnamePronunciations.map(({ pinyin, tone }) => ({ pinyin, tone })),
        { pinyin: firstCharacter.pinyin, tone: firstCharacter.tone },
        { pinyin: secondCharacter.pinyin, tone: secondCharacter.tone },
      ]);
      if (!hasCompleteSurnamePronunciation) {
        phoneticAssessment.notes.push(
          '姓氏读音未完整收录，音律分仅基于已知读音与名字两字。',
        );
      }

      const scoring = scoreName({
        characters: [firstCharacter, secondCharacter],
        tendencies,
        phonetic: phoneticAssessment,
        homophone: homophoneAssessment,
        surnameStrokes,
        classic,
        semantic: semanticAssessment,
      });
      const elements = [
        ...primaryElements(firstCharacter),
        ...primaryElements(secondCharacter),
      ];
      const styleTags = [
        ...new Set([
          ...firstCharacter.styleTags,
          ...secondCharacter.styleTags,
        ]),
      ];

      generated.push({
        id: createNameId(fullName),
        surname: normalizedSurname,
        givenName,
        fullName,
        pinyin: [
          hasCompleteSurnamePronunciation
            ? surnamePinyin.join(' ')
            : normalizedSurname,
          ...givenPinyin,
        ].join(' '),
        tones: [
          ...surnamePronunciations.map(({ tone }) => tone),
          firstCharacter.tone,
          secondCharacter.tone,
        ],
        elements,
        characters: [firstCharacter, secondCharacter],
        meaning: `${firstCharacter.char}：${firstCharacter.meaning}；${secondCharacter.char}：${secondCharacter.meaning}`,
        styleTags,
        score: scoring.score,
        scoreBreakdown: scoring.scoreBreakdown,
        scoreExplanations: scoring.scoreExplanations,
        phoneticAssessment,
        homophoneAssessment,
        semanticAssessment,
        recommendation: `${elements.join('、')}按当前起名倾向参与匹配；${semanticAssessment.notes[0]}；${phoneticAssessment.notes[0]}普通话基础负面谐音库未发现精确命中。${classic ? `${classic.level} 级文化关联见${classic.display}。` : '当前典籍语料未发现可核对文化关联。'}`,
        classic,
      });

      if (
        generated.length >=
        retainedCapacity * GENERATOR_LIMITS.compactionTriggerFactor
      ) {
        generated.sort(compareNames).splice(retainedCapacity);
      }
    });
  });

  const sorted = generated.sort(compareNames).slice(0, retainedCapacity);
  return rerankForDiversity(sorted, limit);
}
