import { describe, expect, it } from 'vitest';

import {
  assertLicenseRegistry,
  assertRejectedCharactersAbsent,
  assignRecommendationTier,
  createCharacterSources,
  createClassicTags,
} from './build-phase6-data.mjs';

describe('Phase 6 data rules', () => {
  it('assigns recommendation tiers without quota-based admission', () => {
    expect(assignRecommendationTier({ suitable: true, usageScore: 80, rarity: 0.2 })).toBe(
      'core',
    );
    expect(assignRecommendationTier({ suitable: true, usageScore: 65, rarity: 0.4 })).toBe(
      'extended',
    );
    expect(assignRecommendationTier({ suitable: true, usageScore: 45, rarity: 0.6 })).toBe(
      'distinctive',
    );
    expect(assignRecommendationTier({ suitable: false, usageScore: 90, rarity: 0.1 })).toBeUndefined();
  });

  it('creates deterministic themes, styles and suitability metadata', () => {
    const tags = createClassicTags({
      source: 'zhouyi',
      title: '乾卦',
      lines: ['天行健，君子以自强不息。'],
    });

    expect(tags.themes).toEqual(expect.arrayContaining(['志向', '坚毅']));
    expect(tags.styles).toEqual(expect.arrayContaining(['古典', '大气']));
    expect(tags.suitability).toBeGreaterThanOrEqual(0);
    expect(tags.suitability).toBeLessThanOrEqual(100);
  });

  it('keeps D-level evidence single-character-only and traceable to an exact line', () => {
    const works = [
      {
        id: 'zhouyi-qian',
        source: 'zhouyi',
        book: '周易',
        title: '乾卦',
        display: '《周易·乾卦》',
        lines: ['天行健，君子以自强不息。'],
        tags: createClassicTags({
          source: 'zhouyi',
          title: '乾卦',
          lines: ['天行健，君子以自强不息。'],
        }),
      },
    ];
    const sources = createCharacterSources(
      [
        { char: '健', naming: { suitable: true } },
        { char: '宁', naming: { suitable: true } },
      ],
      works,
    );

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      char: '健',
      workId: 'zhouyi-qian',
      level: 'D',
      use: 'character-only',
    });
    expect(sources[0].text).toContain('健');
    expect(sources[0]).not.toHaveProperty('givenName');
  });

  it('rejects noncommercial or uncertain licenses from runtime-derived data', () => {
    expect(() =>
      assertLicenseRegistry({
        sources: [
          {
            id: 'unsafe-source',
            usage: 'runtime',
            licenseClass: 'noncommercial',
            derivativePublication: 'prohibited',
          },
        ],
      }),
    ).toThrow(/unsafe-source/);
  });

  it('fails if a protected hard rejection reappears in the approved runtime library', () => {
    expect(() => assertRejectedCharactersAbsent(new Set(['飚']), ['飚'], 'final-review')).toThrow(
      /final-review.*飚/,
    );
  });
});
