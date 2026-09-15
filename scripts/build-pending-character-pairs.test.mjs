import { describe, expect, it } from 'vitest';
import { assessSemanticPair } from '../src/core/naming/semanticPair';
import { passesSemanticFilter } from '../src/core/naming/filters/semanticFilter';
import { assessHomophone } from '../src/core/naming/homophone';
import { scanPendingPairs } from './build-pending-character-pairs.mjs';

function inputs(char = '弼', pinyin = 'bì', tone = 4) {
  const evidence = { facts: { pinyin, tone }, source: { meaning: '辅佐帮助', styleTags: ['清雅'] } };
  return { batch: { entries: [{ char, evidence, review: { decision: 'pending' } }, { char: '颀', review: { decision: 'approved' } }] },
    lexical: { entries: [{ char, sourceEvidence: evidence, reviewFlags: [], previousSuggestion: { suggestion: 'needs-review' } }] },
    recommended: [{ char: '莎', pinyin: 'shā', tone: 1, meanings: { modern: '莎草' }, naming: { suitable: true, styleTags: ['清雅'] } },
      { char: '纱', pinyin: 'shā', tone: 1, meanings: { modern: '纱' }, naming: { suitable: false, styleTags: ['清雅'] } }],
    assessSemanticPair, passesSemanticFilter, assessHomophone };
}

describe('待审字组合规则扫描', () => {
  it('覆盖两位置、排除非启用搭配，并对重叠淘汰原因只计一次', () => {
    const result = scanPendingPairs(inputs());
    expect(result.counts).toMatchObject({ candidates: 1, enabledPartners: 1, checked: 2,
      rejected: 1, passed: 1, semanticRejected: 1, homophoneRejected: 1 });
    expect(result.entries[0].rejected[0].name).toBe('莎弼');
    expect(result.entries[0].samples.first[0].name).toBe('弼莎');
    expect(result.policy.decisionsChanged).toBe(0);
  });

  it('应用茸的事实纠错，来源证据变化则报错', () => {
    const fixture = inputs('茸', 'rōng', 1);
    const result = scanPendingPairs(fixture);
    expect(result.entries[0].checkedPronunciation).toEqual({ pinyin: 'róng', tone: 2 });
    expect(fixture.batch.entries[0].evidence.facts.pinyin).toBe('rōng');
    fixture.lexical.entries[0].sourceEvidence = {};
    expect(() => scanPendingPairs(fixture)).toThrow(/不同步/);
  });

  it('近音只计提示，且不会把 full 范围规则伪装成已验证全名风险', () => {
    const approximate = inputs('白', 'bái', 2);
    approximate.recommended[0] = { ...approximate.recommended[0], char: '次', pinyin: 'cì', tone: 4 };
    expect(scanPendingPairs(approximate).counts).toMatchObject({ checked: 2, rejected: 0, approximateWarnings: 1 });
    const fullOnly = inputs('吴', 'wú', 2);
    fullOnly.recommended[0] = { ...fullOnly.recommended[0], char: '能', pinyin: 'néng', tone: 2 };
    expect(assessHomophone([], ['wú', 'néng']).details).toContainEqual(expect.objectContaining({ scope: 'full' }));
    expect(scanPendingPairs(fullOnly).counts.homophoneRejected).toBe(0);
  });
});
