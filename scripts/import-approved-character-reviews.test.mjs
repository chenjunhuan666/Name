import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  isCanonicalUtcIsoTimestamp,
  prepareApprovedCharacterImport,
  validateReviewBatch,
} from './import-approved-character-reviews.mjs';

function createFixture(
  decision = 'pending',
  char = '颀',
  pinyin = 'qí',
  tone = 2,
  sourceOverrides = {},
) {
  const source = {
    sentiment: 'positive',
    namingUsage: 35,
    rarityLevel: 2,
    meaning: '身材修长',
    styleTags: ['清雅', '刚健'],
    ...sourceOverrides,
  };
  const sourceDictionary = {
    characters: [
      {
        char,
        pinyin,
        toneLevel: tone,
        strokeCount: 10,
        wuxing: '木',
        radical: '页',
        genderBias: 0,
        namingUsage: source.namingUsage,
        rarityLevel: source.rarityLevel,
        sentiment: source.sentiment,
        styleTags: source.styleTags,
        meaningBrief: source.meaning,
      },
    ],
  };
  const sourceDictionaryText = `${JSON.stringify(sourceDictionary, null, 2)}\n`;
  const dictionarySha256 = createHash('sha256')
    .update(sourceDictionaryText)
    .digest('hex');
  const queueEntry = {
    char,
    decision: 'pending',
    reviewNote: '',
    source,
    facts: {
      pinyin,
      tone,
      element: '木',
      radical: '页',
      strokes: 10,
      standardIndex: 2222,
      standardLevel: 1,
    },
    riskFlags: ['below-production-usage-threshold'],
  };
  const queue = {
    source: { commit: 'fixed-commit', dictionarySha256 },
    entries: [queueEntry],
  };
  const queueText = `${JSON.stringify(queue, null, 2)}\n`;
  const review =
    decision === 'approved'
      ? {
          decision,
          note: '含义正向且实际姓名中可自然使用',
          approvedMeaning: '身形修长',
          reviewedBy: 'reviewer-1',
          reviewedAt: '2026-09-04T12:30:00Z',
        }
      : {
          decision,
          note: '',
          approvedMeaning: '',
          reviewedBy: '',
          reviewedAt: '',
        };
  const counts = {
    total: 1,
    pending: Number(decision === 'pending'),
    approved: Number(decision === 'approved'),
    rejected: Number(decision === 'rejected'),
  };
  const batch = {
    schemaVersion: 1,
    batchId: 'positive-below-production-threshold-01',
    sourceQueue: {
      sha256: createHash('sha256').update(queueText).digest('hex'),
      sourceCommit: queue.source.commit,
      dictionarySha256,
    },
    counts,
    entries: [
      {
        char: queueEntry.char,
        evidence: {
          source: queueEntry.source,
          facts: queueEntry.facts,
          riskFlags: queueEntry.riskFlags,
        },
        review,
      },
    ],
  };

  return { batch, queueText, sourceDictionaryText };
}

describe('人工审校批准导入门禁', () => {
  it('批准导入在保留固定证据的同时应用已核验纠错，且重复导入幂等', () => {
    const fixture = createFixture('approved', '茸', 'rōng', 1);
    const inputs = { ...fixture, standardLibrary: { entries: [{ char: '茸', index: 2222, level: 1 }] },
      kangxi: { entries: [], aliases: [] }, recommendedCharacters: [] };
    const result = prepareApprovedCharacterImport(inputs);
    expect(result.additions[0]).toMatchObject({ char: '茸', pinyin: 'róng', tone: 2 });
    expect(result.additions[0].sources.project).toContain('pronunciation-correction:rong-2026-09-05');
    expect(fixture.batch.entries[0].evidence.facts).toMatchObject({ pinyin: 'rōng', tone: 1 });
    expect(prepareApprovedCharacterImport({ ...inputs, recommendedCharacters: result.merged }).alreadyImported).toBe(1);
  });
  it('只选择 approved，pending 与 rejected 都不进入导入集合', () => {
    for (const decision of ['pending', 'rejected']) {
      const { batch, queueText } = createFixture(decision);
      expect(validateReviewBatch(batch, queueText).approvedEntries).toHaveLength(
        0,
      );
    }
  });

  it('接受批次显式声明的中性候选范围，且不接受范围外的证据', () => {
    const { batch, queueText } = createFixture(
      'pending',
      '环',
      'huán',
      2,
      { sentiment: 'neutral', namingUsage: 70 },
    );
    batch.batchId = 'neutral-candidates-02';
    batch.policy = {
      entryEligibility: {
        sentiments: ['neutral'],
        namingUsage: { min: 30 },
        rarityLevel: { maxInclusive: 2 },
      },
    };

    expect(validateReviewBatch(batch, queueText).approvedEntries).toHaveLength(0);

    batch.policy.entryEligibility.sentiments = ['positive'];
    expect(() => validateReviewBatch(batch, queueText)).toThrow(/候选范围/);
  });

  it.each([
    ['note', ''],
    ['approvedMeaning', ''],
    ['reviewedBy', ''],
    ['reviewedAt', '2026-09-04'],
  ])('approved 缺少有效 %s 时拒绝导入', (field, value) => {
    const { batch, queueText } = createFixture('approved');
    batch.entries[0].review[field] = value;
    expect(() => validateReviewBatch(batch, queueText)).toThrow();
  });

  it('拒绝被修改的来源证据和未同步的决策计数', () => {
    const evidenceFixture = createFixture('approved');
    evidenceFixture.batch.entries[0].evidence.source.meaning = '已被修改';
    expect(() =>
      validateReviewBatch(evidenceFixture.batch, evidenceFixture.queueText),
    ).toThrow(/证据/);

    const countFixture = createFixture('approved');
    countFixture.batch.counts.approved = 0;
    expect(() =>
      validateReviewBatch(countFixture.batch, countFixture.queueText),
    ).toThrow(/计数/);
  });

  it('把有效批准记录转换为推荐层结构并保留人工审校来源', () => {
    const { batch, queueText, sourceDictionaryText } =
      createFixture('approved');
    const result = prepareApprovedCharacterImport({
      batch,
      queueText,
      sourceDictionaryText,
      standardLibrary: {
        entries: [{ char: '颀', index: 2222, level: 1 }],
      },
      kangxi: {
        entries: [{ char: '頎', page: 1400, position: '01' }],
        aliases: [{ query: '颀', canonical: '頎' }],
      },
      recommendedCharacters: [],
    });

    expect(result.approvedCount).toBe(1);
    expect(result.additions).toHaveLength(1);
    expect(result.additions[0]).toMatchObject({
      char: '颀',
      traditional: '頎',
      meanings: { modern: '身形修长' },
      naming: { suitable: true, usageScore: 35, gender: 'neutral' },
      sources: {
        standard: ['general-standard-2013:2222:level-1'],
        dictionary: ['kangxi:頎:page-1400:01'],
        project: [
          'ai-chinese-naming:dict.json',
          'manual-review:positive-below-production-threshold-01',
        ],
      },
    });
  });

  it('把批次声明的第二来源标记带入推荐层', () => {
    const { batch, queueText, sourceDictionaryText } = createFixture('approved');
    batch.policy = {
      runtimeSourceMarkers: ['Chinese-Names-Corpus:fixed-commit:gender-120W'],
    };
    const result = prepareApprovedCharacterImport({
      batch,
      queueText,
      sourceDictionaryText,
      standardLibrary: { entries: [{ char: '颀', index: 2222, level: 1 }] },
      kangxi: { entries: [], aliases: [] },
      recommendedCharacters: [],
    });

    expect(result.additions[0].sources.project).toEqual([
      'ai-chinese-naming:dict.json',
      'Chinese-Names-Corpus:fixed-commit:gender-120W',
      'manual-review:positive-below-production-threshold-01',
    ]);
  });

  it('同一批次已按相同内容导入时保持幂等', () => {
    const fixture = createFixture('approved');
    const inputs = {
      batch: fixture.batch,
      queueText: fixture.queueText,
      sourceDictionaryText: fixture.sourceDictionaryText,
      standardLibrary: {
        entries: [{ char: '颀', index: 2222, level: 1 }],
      },
      kangxi: {
        entries: [{ char: '頎', page: 1400, position: '01' }],
        aliases: [{ query: '颀', canonical: '頎' }],
      },
      recommendedCharacters: [],
    };
    const first = prepareApprovedCharacterImport(inputs);
    const second = prepareApprovedCharacterImport({
      ...inputs,
      recommendedCharacters: first.merged,
    });

    expect(second.additions).toHaveLength(0);
    expect(second.alreadyImported).toBe(1);
    expect(second.merged).toEqual(first.merged);
  });

  it('只接受有效的 UTC ISO-8601 审校时间', () => {
    expect(isCanonicalUtcIsoTimestamp('2026-09-04T12:30:00Z')).toBe(true);
    expect(isCanonicalUtcIsoTimestamp('2026-09-04T12:30:00.123Z')).toBe(true);
    expect(isCanonicalUtcIsoTimestamp('2026-02-30T12:30:00Z')).toBe(false);
    expect(isCanonicalUtcIsoTimestamp('2026-09-04T20:30:00+08:00')).toBe(false);
  });
});
