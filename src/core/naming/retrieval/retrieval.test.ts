import { describe, expect, it } from 'vitest';
import type {
  CharacterPronunciation,
  ElementTendency,
  FiveElement,
  NamingCharacter,
  NamingPreference,
} from '../../../types';
import { selectRetrievalCandidates } from './candidateSelector';
import { generateNamesV3WithDiagnostics } from './index';

const elements: FiveElement[] = ['木', '火', '土', '金', '水'];
const tendencies: ElementTendency[] = elements.map((element, index) => ({
  element,
  level: (5 - index) as 1 | 2 | 3 | 4 | 5,
  relation: '日主所生',
  weightedPresence: index,
  reason: `${element}测试倾向`,
}));
const pronunciations: CharacterPronunciation[] = [
  { char: '陈', pinyin: 'chén', tone: 2, strokes: 7 },
];
const preference: NamingPreference = {
  styles: ['清雅'],
  rarityPreference: 'distinctive',
  genderExpression: 'neutral',
};

function character(index: number): NamingCharacter {
  const codePoint = 0x4e00 + index;
  const char = String.fromCodePoint(codePoint);
  return {
    char,
    pinyin: `p${index}`,
    tone: ((index % 4) + 1) as 1 | 2 | 3 | 4,
    element: elements[index % elements.length],
    elementConfidence: 0.8,
    elementBasis: ['测试'],
    strokes: 5 + (index % 12),
    meaning: `${char}的正向完整含义`,
    gender: 'neutral',
    rarity: (index % 10) / 10,
    styleTags: index % 3 === 0 ? ['清雅'] : ['简约'],
    negative: false,
  };
}

describe('V3 姓名候选检索', () => {
  it('先执行强约束，并在多标签配额中确定性去重和补位', () => {
    const characters = Array.from({ length: 40 }, (_, index) => character(index));
    const required = characters[35].char;
    const excluded = characters[2].char;
    const first = selectRetrievalCandidates({
      characters,
      tendencies,
      preference: {
        ...preference,
        includeCharacters: [required],
        excludeCharacters: [excluded],
      },
      classicCharacters: new Set([characters[31].char, characters[32].char]),
      targetCount: 24,
      legacyFloorCount: 12,
    });
    const reversed = selectRetrievalCandidates({
      characters: [...characters].reverse(),
      tendencies,
      preference: {
        ...preference,
        includeCharacters: [required],
        excludeCharacters: [excluded],
      },
      classicCharacters: new Set([characters[31].char, characters[32].char]),
      targetCount: 24,
      legacyFloorCount: 12,
    });

    expect(first.constraintSatisfied).toBe(true);
    expect(first.candidates).toHaveLength(24);
    expect(first.candidates.map(({ char }) => char)).toEqual(
      reversed.candidates.map(({ char }) => char),
    );
    expect(first.candidates.some(({ char }) => char === required)).toBe(true);
    expect(first.candidates.some(({ char }) => char === excluded)).toBe(false);
    expect(new Set(first.candidates.map(({ char }) => char)).size).toBe(24);
    expect(first.assignments[required]).toContain('included');
    expect(first.quotaUsage.exploration.selected).toBeGreaterThan(0);
    expect(
      Object.keys(first.assignments).every((character) =>
        first.candidates.some(({ char }) => char === character),
      ),
    ).toBe(true);
    expect(
      first.candidates.every(({ char }) =>
        first.assignments[char].some((tag) =>
          ['common', 'distinctive'].includes(tag),
        ),
      ),
    ).toBe(true);
  });

  it('包含字在 hard filter 后不可用时拒绝建立候选池', () => {
    const unsafe = { ...character(0), negative: true };
    const result = selectRetrievalCandidates({
      characters: [unsafe, ...Array.from({ length: 8 }, (_, index) => character(index + 1))],
      tendencies,
      preference: { ...preference, includeCharacters: [unsafe.char] },
      classicCharacters: new Set(),
      targetCount: 8,
      legacyFloorCount: 4,
    });

    expect(result.constraintSatisfied).toBe(false);
    expect(result.missingIncludedCharacters).toEqual([unsafe.char]);
    expect(result.candidates).toEqual([]);
  });

  it('Beam 检索限制完整评分规模并保持输出确定', () => {
    const characters = Array.from({ length: 36 }, (_, index) => character(index));
    const options = {
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      preference,
      limit: 20,
    };
    const first = generateNamesV3WithDiagnostics(options, {
      targetCharacterCount: 30,
      legacyFloorCount: 12,
      beamWidthPerFirst: 5,
    });
    const second = generateNamesV3WithDiagnostics(options, {
      targetCharacterCount: 30,
      legacyFloorCount: 12,
      beamWidthPerFirst: 5,
    });

    expect(first).toEqual(second);
    expect(first.names.length).toBeGreaterThan(0);
    expect(first.diagnostics.selectedCharacterCount).toBe(30);
    expect(first.diagnostics.fullScoreCandidateCount).toBeLessThanOrEqual(30 * 5);
    expect(first.diagnostics.consideredPairCount).toBeGreaterThan(
      first.diagnostics.fullScoreCandidateCount,
    );
    expect(first.diagnostics.resultSignature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('V3 排名模型在放宽单一元素对上限后稳定补足二十个多样候选', () => {
    const characters = Array.from({ length: 40 }, (_, index) => character(index));
    const options = {
      surname: '陈',
      characters,
      tendencies,
      pronunciations,
      preference,
      limit: 20,
    };
    const first = generateNamesV3WithDiagnostics(options, {
      targetCharacterCount: 36,
      legacyFloorCount: 20,
      beamWidthPerFirst: 10,
      rankingModel: 'v3',
    });
    const second = generateNamesV3WithDiagnostics(options, {
      targetCharacterCount: 36,
      legacyFloorCount: 20,
      beamWidthPerFirst: 10,
      rankingModel: 'v3',
    });

    expect(first.names).toHaveLength(20);
    expect(first).toEqual(second);
    expect(new Set(first.names.map(({ givenName }) => [...givenName][0])).size)
      .toBeGreaterThanOrEqual(6);
    expect(new Set(first.names.map(({ givenName }) => [...givenName][1])).size)
      .toBeGreaterThanOrEqual(6);
  });
});
