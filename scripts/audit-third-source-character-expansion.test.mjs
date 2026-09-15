import { describe, expect, it } from 'vitest';
import {
  APPROVED_MEANINGS,
  TOP_SURNAMES,
  evaluateThirdSourceCandidates,
  parseAncientNameCorpus,
  parseUnihanMandarin,
  prepareThirdSourceImport,
} from './audit-third-source-character-expansion.mjs';

describe('third source character expansion', () => {
  it('filters the mixed historical corpus by fixed surnames and full-name length', () => {
    expect(TOP_SURNAMES.size).toBe(200);
    const result = parseAncientNameCorpus('By@x\n2020.12.13\n王旻\n欧阳琮\n阿八哈\n王阿般图\n');
    expect(Object.fromEntries(result.frequencies)).toEqual({ 旻: 1, 琮: 1 });
    expect(result.counts).toEqual({
      names: 2,
      uniqueGivenCharacters: 2,
      rejectedLength: 1,
      rejectedSurname: 1,
      rejectedGivenName: 0,
    });
  });

  it('requires a single matching Unihan reading and preserves prior hard decisions', () => {
    const entries = evaluateThirdSourceCandidates({
      standardLibrary: { entries: [
        { char: '旻', index: 1, level: 2 },
        { char: '琮', index: 2, level: 2 },
        { char: '祚', index: 3, level: 2 },
      ] },
      recommendedCharacters: [],
      reviewQueue: { entries: [{ char: '祚' }] },
      previousAudit: { entries: [{ char: '祚', ruleIds: ['neutral.semantic.negative'] }] },
      kangxiCharacters: {
        旻: { py: 'mín', wx: '火', rad: '日', bs: 8, kx: 8 },
        琮: { py: 'cóng', wx: '金', rad: '王', bs: 12, kx: 13 },
        祚: { py: 'zuò', wx: '金', rad: '礻', bs: 9, kx: 10 },
      },
      definitions: { 旻: '天空', 琮: '玉器', 祚: '福' },
      unihanReadings: parseUnihanMandarin('U+65FB\tkMandarin\tMIN2\nU+742E\tkMandarin\tCONG2 ZONG1\nU+795A\tkMandarin\tZUO4\n'),
      modernCorpus: { frequencies: new Map([['旻', 5], ['琮', 5], ['祚', 5]]) },
      ancientCorpus: { frequencies: new Map() },
    });
    expect(entries.find((entry) => entry.char === '旻')?.decision).toBe('approved');
    expect(entries.find((entry) => entry.char === '琮')?.ruleIds).toContain('third-source.reading.not-single');
    expect(entries.find((entry) => entry.char === '祚')?.ruleIds).toContain('third-source.prior-hard-decision');
  });

  it('imports approved records idempotently with complete provenance', () => {
    const audit = {
      genderCounts: { 旻: { male: 8, female: 2, unknown: 0 } },
      entries: [{
        char: '旻', decision: 'approved',
        evidence: { standardIndex: 1, standardLevel: 2, modernOccurrences: 10, ancientOccurrences: 5, pinyin: 'mín', element: '火', radical: '日', strokes: 8, traditional: null, traditionalStrokes: 8 },
        review: { approvedMeaning: APPROVED_MEANINGS.旻, styleTags: ['灵动'] },
      }],
    };
    const standardLibrary = { entries: [{ char: '旻', index: 1, level: 2 }] };
    const first = prepareThirdSourceImport({ audit, standardLibrary, recommendedCharacters: [] });
    expect(first.additions).toHaveLength(1);
    expect(first.additions[0]).toMatchObject({
      char: '旻', tone: 2,
      naming: { suitable: true, gender: 'male', styleTags: ['灵动'] },
      sources: { project: expect.arrayContaining([expect.stringContaining('third-source-audit:')]) },
    });
    const second = prepareThirdSourceImport({ audit, standardLibrary, recommendedCharacters: first.merged });
    expect(second.additions).toHaveLength(0);
    expect(second.alreadyImported).toBe(1);
    expect(second.removed).toEqual([]);
  });
});
