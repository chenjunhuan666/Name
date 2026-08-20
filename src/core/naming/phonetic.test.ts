import { describe, expect, it } from 'vitest';
import { assessPhonetics, splitPinyin } from './phonetic';

describe('splitPinyin', () => {
  it('拆分带声调拼音的声母和韵母', () => {
    expect(splitPinyin('chén')).toEqual({
      plain: 'chen',
      initial: 'ch',
      final: 'en',
    });
  });
});

describe('assessPhonetics', () => {
  it('声调有变化且声韵不重复时得分更高', () => {
    const varied = assessPhonetics([
      { pinyin: 'chén', tone: 2 },
      { pinyin: 'jǐng', tone: 3 },
      { pinyin: 'hé', tone: 2 },
    ]);
    const repeated = assessPhonetics([
      { pinyin: 'lín', tone: 2 },
      { pinyin: 'líng', tone: 2 },
      { pinyin: 'líng', tone: 2 },
    ]);

    expect(varied.score).toBeGreaterThan(repeated.score);
    expect(repeated.notes.join('')).toContain('同声调');
  });
});
