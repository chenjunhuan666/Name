import { describe, expect, it } from 'vitest';
import { collectPendingEvidence, numericPinyin } from './build-pending-character-evidence.mjs';

describe('剩余待审字词典证据', () => {
  it('读音比较保留声调和 ü，并兼容数字标调', () => {
    expect(numericPinyin('lǜ')).toBe('lv4');
    expect(numericPinyin('lu:4')).toBe('lv4');
    expect(numericPinyin('Lü4')).toBe('lv4');
    expect(numericPinyin('qí')).toBe('qi2');
    expect(numericPinyin('qì')).not.toBe(numericPinyin('qí'));
  });

  it('排除已决定项，完整保留词典缺项、读音差异与旧建议', () => {
    const pending = ['甲', '乙'].map((char) => ({ char, evidence: { source: { meaning: '原始释义' }, facts: { pinyin: 'jiǎ' } }, review: { decision: 'pending' } }));
    const guidance = { entries: pending.map(({ char, evidence }) => ({ char, evidence, guidance: { suggestion: 'needsDisambiguation' } })) };
    const entries = collectPendingEvidence({ batch: { entries: [...pending, { char: '颀', review: { decision: 'approved' } }, { char: '铖', review: { decision: 'rejected' } }] },
      guidance, unihan: new Map([['甲', { kDefinition: 'first', kMandarin: 'jiǎ' }]]),
      cedict: new Map([['甲', [{ pinyin: 'jia4', definitions: ['test'] }]]]) });
    expect(entries.map(({ char }) => char)).toEqual(['甲', '乙']);
    expect(entries[0].reviewFlags).toEqual(['cedict-reading-mismatch', 'multiple-dictionary-readings']);
    expect(entries[1].reviewFlags).toEqual(['unihan-definition-missing', 'unihan-reading-missing', 'cedict-entry-missing']);
    expect(entries[0].sourceEvidence).toEqual(pending[0].evidence);
    expect(entries.every(({ decision }) => decision === 'pending')).toBe(true);
  });
});
