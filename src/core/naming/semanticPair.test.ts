import { describe, expect, it } from 'vitest';
import {
  REVIEW_HOMOPHONE_BLOCKLIST,
  REVIEW_HOMOPHONE_BLOCKLIST_SOURCE,
} from '../../data/namingConstraints';
import type { NamingCharacter } from '../../types';
import { passesSemanticFilter } from './filters/semanticFilter';
import { assessSemanticPair } from './semanticPair';

function character(
  char: string,
  meaning: string,
  styleTags: string[],
): NamingCharacter {
  return {
    char,
    pinyin: 'test',
    tone: 1,
    element: '木',
    elementConfidence: 0.7,
    elementBasis: ['测试'],
    meaning,
    gender: 'neutral',
    rarity: 0,
    styleTags,
  };
}

describe('assessSemanticPair', () => {
  it('为风格一致且字义不重复的组合保留正向评估', () => {
    const assessment = assessSemanticPair(
      character('清', '清澈明净', ['清雅', '书卷']),
      character('言', '言而有信', ['清雅', '儒雅']),
    );

    expect(assessment.natural).toBe(true);
    expect(assessment.styleConsistency).toBe(true);
    expect(assessment.completeImage).toBe(true);
    expect(assessment.nameLike).toBe(true);
    expect(assessment.score).toBeGreaterThanOrEqual(90);
  });

  it('对网络文学感组合仅作可解释软降分', () => {
    const assessment = assessSemanticPair(
      character('墨', '书写用的墨', ['古典']),
      character('宸', '屋宇深广', ['古典']),
    );

    expect(assessment.natural).toBe(true);
    expect(assessment.nameLike).toBe(true);
    expect(assessment.overlyWebNovel).toBe(true);
    expect(assessment.notes.join('')).toContain('软降分');
  });

  it('只对两个高频起名字组合软降分，并正确识别“梓”', () => {
    const popular = assessSemanticPair(
      character('梓', '梓树兴盛', ['自然']),
      character('沐', '沐浴润泽', ['自然']),
    );
    const ordinary = assessSemanticPair(
      character('清', '清澈明净', ['清雅']),
      character('言', '言而有信', ['清雅']),
    );

    expect(popular.overlyPopular).toBe(true);
    expect(popular.natural).toBe(true);
    expect(popular.notes.join('')).toContain('两字均属项目高频起名字');
    expect(popular.score).toBeLessThan(ordinary.score);
    expect(ordinary.overlyPopular).toBe(false);
  });

  it('对明确冲突的静态规则组合执行硬拦截', () => {
    const assessment = assessSemanticPair(
      character('生', '生机', ['自然']),
      character('亡', '消亡', ['自然']),
    );

    expect(assessment.natural).toBe(false);
    expect(assessment.score).toBeLessThan(50);
  });

  it('对签署前复核发现的十五个具体谐音组合执行字符级硬拦截', () => {
    expect(REVIEW_HOMOPHONE_BLOCKLIST_SOURCE).toEqual({
      ruleId: 'naming.homophone.review-batch-01',
      evidence:
        'docs/recommended-character-suitability-review-batch-01.json',
    });
    expect(REVIEW_HOMOPHONE_BLOCKLIST).toHaveLength(15);
    expect(
      REVIEW_HOMOPHONE_BLOCKLIST.filter(
        ({ homophone }) => homophone === '晦气',
      ),
    ).toHaveLength(13);
    expect(
      REVIEW_HOMOPHONE_BLOCKLIST.filter(
        ({ homophone }) => homophone === '傻逼',
      ),
    ).toHaveLength(2);

    for (const { givenName } of REVIEW_HOMOPHONE_BLOCKLIST) {
      const [first, second] = [...givenName];
      const assessment = assessSemanticPair(
        character(first, `${first}的正向含义`, ['清雅']),
        character(second, `${second}的正向含义`, ['清雅']),
      );

      expect(assessment.natural, givenName).toBe(false);
      expect(assessment.score, givenName).toBeLessThan(50);
      expect(passesSemanticFilter(assessment), givenName).toBe(false);
    }
  });
});
