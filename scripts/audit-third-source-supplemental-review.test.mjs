import { describe, expect, it } from 'vitest';
import {
  APPROVED_MEANINGS,
  AUDIT_MARKER,
  buildSupplementalAuditEntries,
  prepareSupplementalImport,
} from './audit-third-source-supplemental-review.mjs';

const evidence = {
  standardIndex: 1,
  standardLevel: 1,
  modernOccurrences: 10,
  ancientOccurrences: 5,
  pinyin: 'xī',
  element: '火',
  radical: '日',
  strokes: 11,
  traditional: null,
  traditionalStrokes: 11,
};

describe('third source supplemental semantic review', () => {
  it('累计批准集包含最终一轮 22 个逐字审校结果', () => {
    const currentWave = [...'草荡洗推据梗膏摩簧耒圩怦毗畋峒峋戢塾寮畿蟾夔'];
    expect(currentWave).toHaveLength(22);
    expect(Object.keys(APPROVED_MEANINGS)).toHaveLength(158);
    expect(Object.keys(APPROVED_MEANINGS)).toEqual(expect.arrayContaining(currentWave));
  });

  it('补充审校只接受上一轮唯一语义未批准的字符', () => {
    const audit = {
      entries: Object.keys(APPROVED_MEANINGS).map((char) => ({
        char,
        decision: 'rejected',
        ruleIds: ['third-source.semantic.not-approved'],
        evidence,
      })),
    };
    const entries = buildSupplementalAuditEntries(audit);
    expect(entries).toHaveLength(Object.keys(APPROVED_MEANINGS).length);
    expect(entries.every((entry) => entry.decision === 'approved')).toBe(true);
    expect(entries.every((entry) => entry.review.approvedMeaning.length > 0)).toBe(true);
  });

  it('剩余合格候选全部形成明确决定且拒绝项保留规则和理由', () => {
    const entries = buildSupplementalAuditEntries({
      entries: [
        ...Object.keys(APPROVED_MEANINGS).map((char) => ({
          char,
          decision: 'rejected',
          ruleIds: ['third-source.semantic.not-approved'],
          evidence,
        })),
        { char: '男', decision: 'rejected', ruleIds: ['third-source.semantic.not-approved'], evidence },
      ],
    });
    expect(entries).toHaveLength(Object.keys(APPROVED_MEANINGS).length + 1);
    const rejected = entries.find(({ char }) => char === '男');
    expect(rejected).toMatchObject({
      char: '男',
      decision: 'rejected',
      ruleIds: ['third-source-supplement.semantic.relational-or-generic'],
    });
    expect(rejected.review.rejectionReason.length).toBeGreaterThan(0);
  });

  it('补充审校不会覆盖既有硬拒绝', () => {
    const entries = Object.keys(APPROVED_MEANINGS).map((char) => ({
      char,
      decision: 'rejected',
      ruleIds: ['third-source.semantic.not-approved'],
      evidence,
    }));
    entries[0].ruleIds = ['third-source.prior-hard-decision', 'third-source.semantic.not-approved'];
    expect(() => buildSupplementalAuditEntries({ entries })).toThrow(/命中过既有硬拒绝/u);
  });

  it('补充导入可重复执行且不会产生重复字', () => {
    const audit = {
      genderCounts: { 晞: { male: 3, female: 7, unknown: 0 } },
      entries: [
        {
          char: '晞',
          decision: 'approved',
          evidence,
          review: { approvedMeaning: APPROVED_MEANINGS.晞, styleTags: ['明朗'] },
        },
        {
          char: '男',
          decision: 'rejected',
          evidence,
          review: { rejectionReason: '亲属或性别角色称谓' },
        },
      ],
    };
    const standardLibrary = { entries: [{ char: '晞', index: 1, level: 1 }] };
    const first = prepareSupplementalImport({ audit, standardLibrary, recommendedCharacters: [] });
    expect(first.additions).toHaveLength(1);
    expect(first.merged[0].naming.gender).toBe('female');
    expect(first.merged[0].sources.project).toContain(AUDIT_MARKER);
    const second = prepareSupplementalImport({ audit, standardLibrary, recommendedCharacters: first.merged });
    expect(second.additions).toHaveLength(0);
    expect(second.alreadyImported).toBe(1);
    expect(second.merged).toHaveLength(1);
  });
});
