import { describe, expect, it } from 'vitest';
import type { NamingCharacter } from '../../../types';
import { filterCharacterPool } from './characterFilter';

const base: NamingCharacter = {
  char: '清',
  pinyin: 'qīng',
  tone: 1,
  element: '水',
  elementConfidence: 0.7,
  elementBasis: ['测试'],
  meaning: '清澈',
  gender: 'neutral',
  rarity: 0,
  styleTags: ['清雅'],
};

describe('filterCharacterPool', () => {
  it('在组合前排除负面字、用户排除字和超出生僻偏好的字', () => {
    const result = filterCharacterPool(
      [
        base,
        { ...base, char: '晦', negative: true },
        { ...base, char: '安' },
        { ...base, char: '宁', rarity: 0.5 },
      ],
      {
        styles: ['清雅'],
        excludeCharacters: ['安'],
        rarityPreference: 'common',
        genderExpression: 'neutral',
      },
    );

    expect(result.map(({ char }) => char)).toEqual(['清']);
  });

  it('在组合前排除用户明确选择的风格', () => {
    const result = filterCharacterPool(
      [base, { ...base, char: '安', styleTags: ['温润'] }],
      {
        styles: [],
        excludeStyles: ['清雅'],
        rarityPreference: 'balanced',
        genderExpression: 'neutral',
      },
    );

    expect(result.map(({ char }) => char)).toEqual(['安']);
  });
});
