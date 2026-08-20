import type {
  CharacterPronunciation,
  ClassicWork,
  ElementTendency,
  GeneratedName,
  NamingCharacter,
} from '../../types';
import { createClassicPhraseIndex } from '../classics/classicRepository';
import { assessHomophone } from './homophone';
import { assessPhonetics } from './phonetic';
import { scoreName } from './scorer';

const MAX_POOL_SIZE = 100;
const DEFAULT_RESULT_LIMIT = 60;

export interface GenerateNamesOptions {
  surname: string;
  characters: NamingCharacter[];
  tendencies?: ElementTendency[];
  pronunciations?: CharacterPronunciation[];
  classicWorks?: ClassicWork[];
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

export function generateNames({
  surname,
  characters,
  tendencies,
  pronunciations = [],
  classicWorks = [],
  limit = DEFAULT_RESULT_LIMIT,
}: GenerateNamesOptions): GeneratedName[] {
  const normalizedSurname = surname.trim();
  if (!normalizedSurname || characters.length < 2 || limit <= 0) {
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
  const pool = characters.slice(0, MAX_POOL_SIZE);
  const generated: GeneratedName[] = [];

  pool.forEach((firstCharacter) => {
    pool.forEach((secondCharacter) => {
      if (firstCharacter.char === secondCharacter.char) {
        return;
      }

      const givenName = firstCharacter.char + secondCharacter.char;
      const fullName = normalizedSurname + givenName;
      const classic = classicPhraseIndex.get(givenName);
      const givenPinyin = [firstCharacter.pinyin, secondCharacter.pinyin];
      const homophoneAssessment = assessHomophone(surnamePinyin, givenPinyin);
      if (!homophoneAssessment.safe) {
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
        recommendation: `${elements.join('、')}按当前起名倾向参与匹配；${phoneticAssessment.notes[0]}普通话基础负面谐音库未发现精确命中。${classic ? `名字连续见于${classic.display}。` : '基础典籍语料未发现严格连续出处。'}`,
        classic,
      });
    });
  });

  return generated
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.scoreBreakdown.phonetic - left.scoreBreakdown.phonetic ||
        right.scoreBreakdown.element - left.scoreBreakdown.element ||
        left.givenName.localeCompare(right.givenName, 'zh-CN'),
    )
    .slice(0, limit);
}
