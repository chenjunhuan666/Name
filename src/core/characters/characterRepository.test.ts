/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  filterCharacters,
  loadCharacterLibrary,
  loadPronunciationLibrary,
} from './characterRepository';
import { generateNames } from '../naming/nameGenerator';
import { assessHomophone } from '../naming/homophone';
import { assessSemanticPair } from '../naming/semanticPair';
import { passesPairFilter } from '../naming/filters/pairFilter';
import { REVIEW_HOMOPHONE_BLOCKLIST } from '../../data/namingConstraints';
import type {
  NamingCharacterV2,
  StandardCharacterLibrary,
} from '../../types';

const standard = JSON.parse(
  readFileSync(
    new URL('../../../public/data/characters/standard.json', import.meta.url),
    'utf8',
  ),
) as StandardCharacterLibrary;
const recommended = JSON.parse(
  readFileSync(
    new URL(
      '../../../public/data/characters/recommended-v2.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as NamingCharacterV2[];
const reviewQueue = JSON.parse(
  readFileSync(
    new URL('../../../docs/recommended-character-review.json', import.meta.url),
    'utf8',
  ),
) as {
  counts: {
    currentEnabled: number;
    pending: number;
    positiveBelowThreshold: number;
    neutral: number;
    projectedIfAllApproved: number;
  };
  entries: Array<{
    char: string;
    decision: 'pending';
    source: {
      sentiment: string;
      namingUsage: number;
    };
    riskFlags: string[];
  }>;
};
const reviewBatch = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-review-batch-01.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  counts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  entries: Array<{
    char: string;
    evidence: {
      source: { sentiment: string; namingUsage: number };
    };
    review: {
      decision: 'pending' | 'approved' | 'rejected';
      note: string;
      approvedMeaning?: string;
      reviewedBy: string;
      reviewedAt: string;
    };
  }>;
};
const neutralReviewBatch = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-review-batch-02-neutral.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  counts: { total: number; pending: number; approved: number; rejected: number };
  entries: Array<{ char: string; review: { decision: 'pending' | 'approved' | 'rejected' } }>;
};
const secondSourceReviewBatch = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-review-batch-03-second-source.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  sources: { commit: string; license: string; corpusSha256: string };
  policy: { runtimeSourceMarkers: string[] };
  counts: { total: number; pending: number; approved: number; rejected: number };
  entries: Array<{ char: string; review: { decision: 'approved' } }>;
};
const thirdSourceAudit = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-third-source-audit-2026-09-12.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  sources: { kangxi: { commit: string; license: string } };
  counts: { total: number; pending: number; approved: number; rejected: number };
  runtime: { beforeEnabled: number; afterEnabled: number; remainingTo2500: number };
  entries: Array<{
    char: string;
    decision: 'approved' | 'rejected';
    review: { approvedMeaning: string };
  }>;
};
const thirdSourceSupplement = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-third-source-supplement-2026-09-13.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  auditId: string;
  counts: { total: number; pending: number; approved: number; rejected: number };
  runtime: { beforeEnabled: number; afterEnabled: number; remainingTo2500: number };
  entries: Array<
    | {
      char: string;
      decision: 'approved';
      review: { approvedMeaning: string };
    }
    | {
      char: string;
      decision: 'rejected';
      review: { rejectionReason: string };
    }
  >;
};
const reviewGuidance = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-review-guidance-batch-01.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  counts: {
    total: number;
    retainForIndependentCheck: number;
    likelyReject: number;
    needsDisambiguation: number;
    finalDecisionsWritten: number;
  };
  policy: {
    runtimeEffect: 'none';
  };
  entries: Array<{
    char: string;
    guidance: {
      suggestion:
        | 'retain-for-independent-check'
        | 'likely-reject'
        | 'needs-disambiguation';
      finalDecisionWritten: false;
    };
  }>;
};
const independentReview = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-independent-review-batch-01.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  sources: {
    lexical: { version: string; fields: string[] };
    nameUsage: { commit: string; license: string };
  };
  policy: {
    runtimeEffect: 'none';
    finalDecisionWritten: false;
  };
  counts: {
    total: number;
    evidenceStatus: {
      supported: number;
      ambiguous: number;
      insufficient: number;
    };
    nameCorpusCoverage: { present: number; absent: number };
    meaningAlignment: {
      corroborated: number;
      partial: number;
      unsupported: number;
    };
    pinyinMatches: number;
    finalDecisionsWritten: number;
  };
  entries: Array<{
    char: string;
    independentEvidence: {
      unihan: { pinyinMatches: boolean };
      chineseNames: { coverage: 'present' | 'absent' };
    };
    assessment: {
      evidenceStatus: 'supported' | 'ambiguous' | 'insufficient';
      finalDecisionWritten: false;
    };
  }>;
};
const suitabilityReview = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/recommended-character-suitability-review-batch-01.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  sources: {
    dictionary: {
      release: string;
      decompressedSha256: string;
      license: string;
    };
    recommendedLayer: { enabledCharacters: number };
  };
  policy: {
    runtimeEffect: 'none';
    finalDecisionWritten: false;
  };
  counts: {
    total: number;
    recommendations: {
      approveCandidate: number;
      needsHumanJudgment: number;
      rejectCandidate: number;
    };
    homophoneRisk: { high: number; medium: number; low: number };
    finalDecisionsWritten: number;
  };
  entries: Array<{
    char: string;
    homophoneReview: {
      projectGivenNamePairScreen: {
        screenedPairs: number;
        matchedPairs: number;
        matches: Array<{ pair: string }>;
      };
      surnameDependentRiskChecked: false;
    };
    pairReview: { naturalnessVerified: false };
    recommendation: {
      value:
        | 'approve-candidate'
        | 'needs-human-judgment'
        | 'reject-candidate';
      finalDecisionWritten: false;
    };
  }>;
};

describe('V2 两层汉字库', () => {
  it('Phase 6 将全部启用字分入 Core、Extended、Distinctive 且加载时保留层级', async () => {
    const enabled = recommended.filter(({ naming }) => naming.suitable);
    const tierCounts = Object.fromEntries(
      ['core', 'extended', 'distinctive'].map((tier) => [
        tier,
        enabled.filter(({ naming }) => naming.tier === tier).length,
      ]),
    );

    expect(tierCounts).toEqual({ core: 492, extended: 1029, distinctive: 639 });
    expect(enabled.every(({ naming }) => naming.tier)).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const loaded = await loadCharacterLibrary();
      expect(loaded.find(({ char }) => char === enabled[0].char)?.recommendationTier)
        .toBe(enabled[0].naming.tier);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('预览筛选会排除用户选择的风格', () => {
    const characters = [
      {
        char: '清',
        pinyin: 'qīng',
        tone: 1 as const,
        element: '水' as const,
        elementConfidence: 0.7,
        elementBasis: ['测试'],
        meaning: '清澈',
        gender: 'neutral' as const,
        rarity: 0,
        styleTags: ['清雅'],
      },
      {
        char: '宁',
        pinyin: 'níng',
        tone: 2 as const,
        element: '火' as const,
        elementConfidence: 0.7,
        elementBasis: ['测试'],
        meaning: '安宁',
        gender: 'neutral' as const,
        rarity: 0,
        styleTags: ['温润'],
      },
    ];

    expect(
      filterCharacters(characters, { excludedStyleTags: ['清雅'] }).map(
        ({ char }) => char,
      ),
    ).toEqual(['宁']);
  });

  it('实际读音表加载茸的二声纠错，拒绝推荐不改变原始证据', async () => {
    const pronunciations = JSON.parse(readFileSync(new URL('../../../public/data/characters/pronunciations.json', import.meta.url), 'utf8'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => pronunciations }));
    try {
      expect((await loadPronunciationLibrary()).find(({ char }) => char === '茸'))
        .toMatchObject({ char: '茸', pinyin: 'róng', tone: 2, strokes: 9 });
      expect(reviewBatch.entries.find(({ char }) => char === '茸'))
        .toMatchObject({ evidence: { facts: { pinyin: 'rōng', tone: 1 } }, review: { decision: 'rejected' } });
      expect(recommended.some(({ char }) => char === '茸')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('标准层固定为官方三级 8105 字结构', () => {
    expect(standard.counts).toEqual({
      total: 8105,
      level1: 3500,
      level2: 3000,
      level3: 1605,
    });
    expect(standard.entries).toHaveLength(8105);
    expect(new Set(standard.entries.map(({ char }) => char)).size).toBe(8105);
    expect(standard.entries[0]).toEqual({ char: '一', index: 1, level: 1 });
    expect(standard.entries.at(-1)).toEqual({
      char: '蠼',
      index: 8105,
      level: 3,
    });
    expect(standard.source.independentCheck?.result).toBe('exact-match');
  });

  it('推荐层包含所有显式批准记录，只启用规范字', () => {
    const enabled = recommended.filter(({ naming }) => naming.suitable);
    const standardCharacters = new Set(
      standard.entries.map(({ char }) => char),
    );

    expect(recommended).toHaveLength(
      1454 +
        neutralReviewBatch.counts.approved +
        secondSourceReviewBatch.counts.approved +
        thirdSourceAudit.counts.approved +
        thirdSourceSupplement.counts.approved,
    );
    expect(enabled).toHaveLength(
      1453 +
        neutralReviewBatch.counts.approved +
        secondSourceReviewBatch.counts.approved +
        thirdSourceAudit.counts.approved +
        thirdSourceSupplement.counts.approved,
    );
    expect(enabled.every(({ char }) => standardCharacters.has(char))).toBe(true);
    expect(
      recommended.find(({ char }) => char === '飚')?.naming.suitable,
    ).toBe(false);
  });

  it('推荐记录包含事实层、传统分类和来源定位', () => {
    const linked = recommended.find(({ char }) => char === '辉');

    expect(linked).toMatchObject({
      traditional: '輝',
      elements: {
        primary: '水',
        confidence: 0.7,
      },
      naming: {
        suitable: true,
        usageScore: 95,
      },
    });
    expect(linked?.sources.standard?.[0]).toMatch(
      /^general-standard-2013:\d{4}:level-[123]$/,
    );
    expect(linked?.sources.dictionary?.[0]).toMatch(/^kangxi:輝:/);
  });

  it('固定候选队列保留原始状态，只有显式批准字进入推荐层', () => {
    const recommendedCharacters = new Set(recommended.map(({ char }) => char));
    const approvedCharacters = new Set([
      ...reviewBatch.entries,
      ...neutralReviewBatch.entries,
      ...secondSourceReviewBatch.entries,
    ].filter(({ review }) => review.decision === 'approved').map(({ char }) => char));
    for (const { char, decision } of thirdSourceAudit.entries) {
      if (decision === 'approved') approvedCharacters.add(char);
    }
    for (const { char, decision } of thirdSourceSupplement.entries) {
      if (decision === 'approved') approvedCharacters.add(char);
    }

    expect(reviewQueue.counts).toMatchObject({
      currentEnabled: 1433,
      pending: 1071,
      positiveBelowThreshold: 83,
      neutral: 988,
      projectedIfAllApproved: 2504,
    });
    expect(
      reviewQueue.entries.every(
        ({ char, decision }) =>
          decision === 'pending' && recommendedCharacters.has(char) === approvedCharacters.has(char),
      ),
    ).toBe(true);
    for (const riskyCharacter of ['暗', '忡', '谍', '辜']) {
      expect(
        reviewQueue.entries
          .find(({ char }) => char === riskyCharacter)
          ?.riskFlags.includes('meaning-risk-keyword'),
      ).toBe(true);
    }
  });

  it('第二来源只追加固定批次批准字并保留来源 commit', () => {
    const neutralDecisionByCharacter = new Map(
      neutralReviewBatch.entries.map((entry) => [entry.char, entry.review.decision]),
    );
    const runtimeMarker = secondSourceReviewBatch.policy.runtimeSourceMarkers[0];

    expect(secondSourceReviewBatch.counts).toEqual({
      total: 204,
      pending: 0,
      approved: 204,
      rejected: 0,
    });
    expect(secondSourceReviewBatch.sources).toMatchObject({
      commit: '47d4af8d816f6212787ddfc49173cac3b994b58d',
      license: 'Apache-2.0',
      corpusSha256:
        '30d83f3e682d355ac1d3f18482c14ff5e2bdd0ebe704bff1ef196eabdf93939b',
    });
    expect(
      secondSourceReviewBatch.entries.every(
        ({ char }) =>
          neutralDecisionByCharacter.get(char) === 'rejected' &&
          recommended
            .find((entry) => entry.char === char)
            ?.sources.project?.includes(runtimeMarker),
      ),
    ).toBe(true);
  });

  it('首批正向低阈值候选必须逐字显式审校', () => {
    const positiveCandidates = reviewQueue.entries
      .filter(({ source }) => source.sentiment === 'positive')
      .map(({ char }) => char)
      .sort();
    const batchCharacters = reviewBatch.entries.map(({ char }) => char).sort();

    expect(reviewBatch.counts).toEqual({
      total: 83,
      pending: 0,
      approved: 20,
      rejected: 63,
    });
    expect(batchCharacters).toEqual(positiveCandidates);
    expect(
      reviewBatch.entries.every(
        ({ evidence, review }) =>
          evidence.source.sentiment === 'positive' &&
          evidence.source.namingUsage >= 30 &&
          evidence.source.namingUsage < 40 &&
          (review.decision === 'approved'
            ? Boolean(review.note && review.approvedMeaning && review.reviewedBy && review.reviewedAt)
            : review.decision === 'rejected'
              ? Boolean(review.note && review.reviewedBy && review.reviewedAt) && review.approvedMeaning === ''
              : review.note === '' && review.reviewedBy === '' && review.reviewedAt === ''),
      ),
    ).toBe(true);
    expect(reviewBatch.entries.filter(({ review }) => review.decision === 'approved')
      .map(({ char }) => char).sort()).toEqual([... '充攀夙讴诤柢弼鹭禀玎谌颀铖矜髦踔鎏苞濂箐'].sort());
    expect(reviewBatch.entries.filter(({ review }) => review.decision === 'pending')
      .map(({ char }) => char)).toEqual([]);
    for (const entry of reviewBatch.entries.filter(({ review }) => review.decision === 'approved')) {
      expect(recommended.find(({ char }) => char === entry.char)).toMatchObject({
        meanings: { modern: entry.review.approvedMeaning },
        sources: { project: ['ai-chinese-naming:dict.json', 'manual-review:positive-below-production-threshold-01'] },
      });
    }
  });

  it('初步审校建议覆盖全部批次但不写入最终决定', () => {
    const batchCharacters = reviewBatch.entries.map(({ char }) => char).sort();
    const guidanceCharacters = reviewGuidance.entries
      .map(({ char }) => char)
      .sort();

    expect(reviewGuidance.counts).toEqual({
      total: 83,
      retainForIndependentCheck: 19,
      likelyReject: 45,
      needsDisambiguation: 19,
      finalDecisionsWritten: 0,
    });
    expect(guidanceCharacters).toEqual(batchCharacters);
    expect(reviewGuidance.policy.runtimeEffect).toBe('none');
    expect(
      reviewGuidance.entries.every(
        ({ guidance }) => guidance.finalDecisionWritten === false,
      ),
    ).toBe(true);
  });

  it('独立证据核验只覆盖 19 个保留复核字且不产生运行时决定', () => {
    const expectedCharacters = reviewGuidance.entries
      .filter(
        ({ guidance }) =>
          guidance.suggestion === 'retain-for-independent-check',
      )
      .map(({ char }) => char)
      .sort();
    const actualCharacters = independentReview.entries
      .map(({ char }) => char)
      .sort();

    expect(independentReview.counts).toEqual({
      total: 19,
      evidenceStatus: { supported: 9, ambiguous: 7, insufficient: 3 },
      nameCorpusCoverage: { present: 16, absent: 3 },
      meaningAlignment: { corroborated: 11, partial: 7, unsupported: 1 },
      pinyinMatches: 19,
      finalDecisionsWritten: 0,
    });
    expect(independentReview.sources.lexical).toMatchObject({
      version: '17.0.0',
      fields: ['kDefinition', 'kMandarin'],
    });
    expect(independentReview.sources.nameUsage).toMatchObject({
      commit: 'dd948e738da42d22f5158877d359df359b190589',
    });
    expect(independentReview.sources.nameUsage.license).toContain(
      'non-commercial use only',
    );
    expect(actualCharacters).toEqual(expectedCharacters);
    expect(independentReview.policy).toMatchObject({
      runtimeEffect: 'none',
      finalDecisionWritten: false,
    });
    expect(
      independentReview.entries.every(
        ({ independentEvidence, assessment }) =>
          independentEvidence.unihan.pinyinMatches &&
          assessment.finalDecisionWritten === false,
      ),
    ).toBe(true);
  });

  it('签署前适名性复核只生成候选建议并保留姓氏与自然度门禁', () => {
    const expectedCharacters = independentReview.entries
      .filter(
        ({ assessment }) => assessment.evidenceStatus === 'supported',
      )
      .map(({ char }) => char)
      .sort();
    const actualCharacters = suitabilityReview.entries
      .map(({ char }) => char)
      .sort();
    const totalMatchedPairs = suitabilityReview.entries.reduce(
      (total, { homophoneReview }) =>
        total + homophoneReview.projectGivenNamePairScreen.matchedPairs,
      0,
    );

    expect(suitabilityReview.counts).toEqual({
      total: 9,
      recommendations: {
        approveCandidate: 2,
        needsHumanJudgment: 4,
        rejectCandidate: 3,
      },
      homophoneRisk: { high: 3, medium: 5, low: 1 },
      finalDecisionsWritten: 0,
    });
    expect(suitabilityReview.sources.dictionary).toEqual({
      name: 'CC-CEDICT',
      publisher: 'MDBG',
      release: '2026-09-03 08:26:05 GMT',
      downloadUrl:
        'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
      decompressedSha256:
        'c211a1138cdc1194b492532c4ac3eb3a7bb786cbba2165ba885f91d34f266c88',
      license: 'CC BY-SA 4.0',
      attributionUrl:
        'https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
    });
    expect(suitabilityReview.sources.recommendedLayer.enabledCharacters).toBe(
      1433,
    );
    expect(actualCharacters).toEqual(expectedCharacters);
    expect(suitabilityReview.policy).toMatchObject({
      runtimeEffect: 'none',
      finalDecisionWritten: false,
    });
    expect(
      suitabilityReview.entries.every(
        ({ homophoneReview, pairReview, recommendation }) =>
          homophoneReview.projectGivenNamePairScreen.screenedPairs === 2866 &&
          homophoneReview.surnameDependentRiskChecked === false &&
          pairReview.naturalnessVerified === false &&
          recommendation.finalDecisionWritten === false,
      ),
    ).toBe(true);
    expect(totalMatchedPairs).toBe(15);
    expect(
      suitabilityReview.entries
        .find(({ char }) => char === '颀')
        ?.homophoneReview.projectGivenNamePairScreen.matches.map(
          ({ pair }) => pair,
        ),
    ).toContain('辉颀');
    expect(
      suitabilityReview.entries
        .find(({ char }) => char === '弼')
        ?.homophoneReview.projectGivenNamePairScreen.matches.map(
          ({ pair }) => pair,
        ),
    ).toEqual(['莎弼', '纱弼']);
  });

  it('实际字库加载批准字并参与生成，危险组合继续淘汰', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = await loadCharacterLibrary();
      expect(characters).toHaveLength(
        1453 +
          neutralReviewBatch.counts.approved +
          secondSourceReviewBatch.counts.approved +
          thirdSourceAudit.counts.approved +
          thirdSourceSupplement.counts.approved,
      );
      expect(characters.find(({ char }) => char === '颀')?.meaning).toBe('身材修长');
      expect(characters.find(({ char }) => char === '铖')?.meaning).toBe('人名用字');
      const pool = characters.filter(({ char }) => ['颀', '铖', '宇', '然', '辉', '梓'].includes(char));
      const options = { surname: '陈', characters: pool, limit: 60 };
      const names = generateNames(options);
      expect(names.some(({ givenName }) => givenName.includes('颀'))).toBe(true);
      expect(names.some(({ givenName }) => givenName.includes('铖'))).toBe(true);
      for (const { givenName } of REVIEW_HOMOPHONE_BLOCKLIST) {
        const unsafePool = characters.filter(({ char }) => givenName.includes(char));
        expect(generateNames({ ...options, characters: unsafePool }).map(({ givenName }) => givenName))
          .not.toContain(givenName);
      }
      const withSurname = generateNames({ ...options, surname: '杜',
        pronunciations: [{ char: '杜', pinyin: 'dù', tone: 4 }] });
      expect(withSurname.map(({ givenName }) => givenName)).not.toContain('梓颀');
      expect(withSurname.map(({ givenName }) => givenName)).not.toContain('梓铖');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('第三来源审计零待审，批准字完整加载且拒绝字保持隔离', async () => {
    expect(thirdSourceAudit.counts).toEqual({
      total: 846,
      approved: 175,
      rejected: 671,
      pending: 0,
    });
    expect(thirdSourceAudit.runtime).toEqual({
      beforeEnabled: 1827,
      afterEnabled: 2002,
      remainingTo2500: 498,
    });
    expect(thirdSourceAudit.sources.kangxi).toMatchObject({
      commit: 'fad0bdf7c34b0ec555edbb2af91db737825a4beb',
      license: 'MIT',
    });
    const marker = 'third-source-audit:recommended-character-expansion-2026-09-12';
    const imported = recommended.filter((entry) => entry.sources.project?.includes(marker));
    expect(imported).toHaveLength(thirdSourceAudit.counts.approved);
    expect(new Set(imported.map(({ char }) => char)).size).toBe(imported.length);
    for (const entry of thirdSourceAudit.entries.filter(({ decision }) => decision === 'approved')) {
      expect(imported.find(({ char }) => char === entry.char)).toMatchObject({
        meanings: { modern: entry.review.approvedMeaning },
        naming: { suitable: true },
      });
    }
    for (const entry of thirdSourceAudit.entries.filter(({ decision }) => decision === 'rejected')) {
      expect(imported.some(({ char }) => char === entry.char), entry.char).toBe(false);
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = await loadCharacterLibrary();
      expect(characters).toHaveLength(thirdSourceSupplement.runtime.afterEnabled);
      expect(characters.find(({ char }) => char === '旻')).toMatchObject({
        pinyin: 'mín', tone: 2, meaning: '天空', element: '火',
      });
      const names = generateNames({
        surname: '陈',
        limit: 60,
        characters: characters.filter(({ char }) => ['旻', '琮', '宇'].includes(char)),
      });
      expect(names.some(({ givenName }) => givenName.includes('旻'))).toBe(true);
      expect(names.some(({ givenName }) => givenName.includes('琮'))).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('补充语义审校完整闭合 426 项并加载 158 个批准字', async () => {
    expect(thirdSourceSupplement.counts).toEqual({
      total: 426,
      approved: 158,
      rejected: 268,
      pending: 0,
    });
    expect(thirdSourceSupplement.runtime).toEqual({
      beforeEnabled: 2002,
      afterEnabled: 2160,
      remainingTo2500: 340,
    });
    const marker = `third-source-supplement:${thirdSourceSupplement.auditId}`;
    const imported = recommended.filter((entry) => entry.sources.project?.includes(marker));
    expect(imported).toHaveLength(thirdSourceSupplement.counts.approved);
    expect(new Set(imported.map(({ char }) => char)).size).toBe(imported.length);
    const approvedEntries = thirdSourceSupplement.entries.filter((entry) => entry.decision === 'approved');
    const rejectedEntries = thirdSourceSupplement.entries.filter((entry) => entry.decision === 'rejected');
    expect(approvedEntries).toHaveLength(thirdSourceSupplement.counts.approved);
    expect(rejectedEntries).toHaveLength(thirdSourceSupplement.counts.rejected);
    for (const entry of approvedEntries) {
      expect(imported.find(({ char }) => char === entry.char)).toMatchObject({
        meanings: { modern: entry.review.approvedMeaning },
        naming: { suitable: true },
      });
    }
    expect(rejectedEntries.every(({ char }) => !imported.some((entry) => entry.char === char))).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = await loadCharacterLibrary();
      expect(characters).toHaveLength(thirdSourceSupplement.runtime.afterEnabled);
      expect(characters.find(({ char }) => char === '晞')).toMatchObject({
        pinyin: 'xī', tone: 1, meaning: '破晓，晨光初现',
      });
      const names = generateNames({
        surname: '陈',
        limit: 60,
        characters: characters.filter(({ char }) => ['晞', '宇', '然'].includes(char)),
      });
      expect(names.some(({ givenName }) => givenName.includes('晞'))).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('前轮批准的十一字使用确认释义参与生成，拒绝和暂缓字均不加载', async () => {
    const meanings: Record<string, string> = {
      充: '充足、充实', 攀: '攀登', 夙: '早、素来', 讴: '歌唱',
      诤: '直言规劝', 柢: '根、根基', 弼: '辅佐、辅助', 鹭: '鹭鸟',
      禀: '赋予、承受', 玎: '叮当声', 谌: '真诚、忠信',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = await loadCharacterLibrary();
      for (const [char, meaning] of Object.entries(meanings)) {
        expect(characters.find((entry) => entry.char === char)?.meaning).toBe(meaning);
        const names = generateNames({ surname: '陈', limit: 60,
          characters: characters.filter((entry) => [char, '宇', '然'].includes(entry.char)) });
        expect(names.some(({ givenName }) => givenName.includes(char)), char).toBe(true);
      }
      const excluded = reviewBatch.entries.filter(({ review }) => review.decision !== 'approved');
      expect(excluded).toHaveLength(63);
      for (const { char } of excluded) {
        expect(characters.some((entry) => entry.char === char), char).toBe(false);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('本轮六字加载确认释义和读音，鎏芒仍由实际生成过滤', async () => {
    const meanings: Record<string, string> = {
      矜: '庄重自持', 髦: '杰出人才（比喻义）', 踔: '跨步、超越',
      鎏: '成色好的黄金', 苞: '花苞', 濂: '水名，指濂溪',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = await loadCharacterLibrary();
      for (const [char, meaning] of Object.entries(meanings)) {
        expect(characters.find((entry) => entry.char === char)?.meaning, char).toBe(meaning);
        const names = generateNames({ surname: '陈', limit: 60,
          characters: characters.filter((entry) => [char, '宇', '然'].includes(entry.char)) });
        const selected = names.filter(({ givenName }) => givenName.includes(char));
        expect(selected.length, char).toBeGreaterThan(0);
        expect(selected.every((name) => name.meaning.includes(`${char}：${meaning}`)), char).toBe(true);
        if (char === '踔') {
          expect(characters.find((entry) => entry.char === char)).toMatchObject({ pinyin: 'chuō', tone: 1 });
          expect(selected.every((name) => name.pinyin.includes('chuō'))).toBe(true);
        }
      }
      const unsafe = characters.filter(({ char }) => ['鎏', '芒'].includes(char));
      expect(unsafe).toHaveLength(2);
      const liu = unsafe.find(({ char }) => char === '鎏')!;
      const mang = unsafe.find(({ char }) => char === '芒')!;
      expect(assessHomophone([], [liu.pinyin, mang.pinyin]).details).toEqual(
        expect.arrayContaining([expect.objectContaining({ scope: 'given', matchType: 'exact' })]),
      );
      expect(generateNames({ surname: '陈', characters: unsafe, limit: 60 })
        .some(({ givenName }) => givenName === '鎏芒')).toBe(false);
      for (const char of ['銮', '蹁', '嬴']) {
        expect(reviewBatch.entries.find((entry) => entry.char === char)?.review.decision).toBe('rejected');
        expect(characters.some((entry) => entry.char === char)).toBe(false);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('箐经用户批准加载确认音义并参与生成，同字组合仍被拒绝', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = await loadCharacterLibrary();
      const qing = characters.find(({ char }) => char === '箐')!;
      expect(qing).toMatchObject({ pinyin: 'qìng', tone: 4, meaning: '山间竹林' });
      expect(reviewBatch.entries.find(({ char }) => char === '箐')?.review).toMatchObject({
        decision: 'approved', approvedMeaning: '山间竹林',
      });
      expect(passesPairFilter(qing, qing, assessSemanticPair(qing, qing))).toBe(false);
      const names = generateNames({ surname: '陈', limit: 60,
        characters: characters.filter(({ char }) => ['箐', '宇', '然'].includes(char)) });
      const selected = names.filter(({ givenName }) => givenName.includes('箐'));
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.every((name) => name.pinyin.includes('qìng') && name.meaning.includes('箐：山间竹林'))).toBe(true);
      expect(names.some(({ givenName }) => givenName === '箐箐')).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });

  it('本轮六字互配逐对验证：六个同字组合拒绝，三十个异字组合可参与生成', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => recommended }));
    try {
      const characters = (await loadCharacterLibrary()).filter(({ char }) => '矜髦踔鎏苞濂'.includes(char));
      expect(characters).toHaveLength(6);
      let same = 0;
      let different = 0;
      for (const first of characters) {
        for (const second of characters) {
          const allowed = passesPairFilter(first, second, assessSemanticPair(first, second));
          if (first.char === second.char) {
            expect(allowed, first.char + second.char).toBe(false);
            same += 1;
          } else {
            expect(allowed, first.char + second.char).toBe(true);
            // Two-character pools avoid whole-pool ranking/diversity truncation.
            const names = generateNames({ surname: '陈', characters: [first, second], limit: 60 });
            expect(names.map(({ givenName }) => givenName)).toContain(first.char + second.char);
            different += 1;
          }
        }
      }
      expect({ same, different }).toEqual({ same: 6, different: 30 });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
