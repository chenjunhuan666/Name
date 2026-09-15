import { describe, expect, it } from 'vitest';
import { assessHomophone } from '../src/core/naming/homophone';
import { normalizePinyin } from '../src/core/naming/phonetic';
import { buildPrefixReview } from './build-character-prefix-review.mjs';

describe('候选字前缀谐音扫描', () => {
  it('复用生产规则检查两个位置，合并同音前缀并保留字符覆盖', () => {
    const result = buildPrefixReview({
      pronunciations: [{ char: '杜', pinyin: 'dù' }, { char: '渡', pinyin: 'dù' }, { char: '缺' }],
      recommended: [{ char: '子', pinyin: 'zǐ', naming: { suitable: true } },
        { char: '资', pinyin: 'zī', naming: { suitable: false } }],
      review: { entries: ['颀', '铖'].map((char, index) => ({ char,
        sourceEvidence: { pinyin: index ? 'chéng' : 'qí' } })) },
      assessHomophone, normalizePinyin,
    });
    expect(result.coverage.normalizedPrefixGroups).toBe(1);
    expect(result.coverage.excludedCharacters).toEqual(['缺']);
    for (const entry of result.entries) {
      expect(entry.evaluations).toBe(2);
      expect(entry.matches).toHaveLength(1);
      expect(entry.matches[0]).toMatchObject({ givenName: `子${entry.char}`,
        prefixCharacters: ['杜', '渡'], details: [{ label: '肚子', scope: 'surname-first', matchType: 'exact' }] });
    }
    expect(result.policy.finalDecisionsWritten).toBe(0);
  });
});
