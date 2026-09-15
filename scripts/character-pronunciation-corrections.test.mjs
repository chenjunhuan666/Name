import { describe, expect, it } from 'vitest';
import { applyPronunciationCorrection } from './character-pronunciation-corrections.mjs';

describe('固定来源读音纠错', () => {
  it('同时修正声调与拼音，保留原对象及无关字段，重复应用不累积来源', () => {
    const original = { char: '茸', pinyin: 'rōng', tone: 1, strokes: 9,
      sources: { project: ['original-source'] } };
    const corrected = applyPronunciationCorrection(original);
    expect(corrected).toMatchObject({ char: '茸', pinyin: 'róng', tone: 2, strokes: 9,
      sources: { project: ['original-source', 'pronunciation-correction:rong-2026-09-05'] } });
    expect(original.pinyin).toBe('rōng');
    expect(applyPronunciationCorrection(corrected)).toEqual(corrected);
    expect(applyPronunciationCorrection({ char: '颀', pinyin: 'qí', tone: 2 }))
      .toEqual({ char: '颀', pinyin: 'qí', tone: 2 });
  });

  it('来源产生未登记读音时停止，不能无条件覆盖新事实', () => {
    expect(() => applyPronunciationCorrection({ char: '茸', pinyin: 'rǒng', tone: 3 })).toThrow(/重新核验/);
    expect(() => applyPronunciationCorrection({ char: '茸', pinyin: 'róng', tone: 1 })).toThrow(/重新核验/);
  });
});
