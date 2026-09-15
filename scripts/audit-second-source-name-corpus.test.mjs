import { describe, expect, it } from 'vitest';
import {
  parseNameCorpus,
  selectSecondSourceApprovals,
} from './audit-second-source-name-corpus.mjs';

describe('第二来源姓名语料审计', () => {
  it('复姓优先拆分，并按名字用字累计频次与性别', () => {
    const corpus = parseNameCorpus(
      'dict,sex\n欧阳明,男\n陈明月,女\n司马安,未知\n',
    );

    expect(corpus.counts).toEqual({
      names: 3,
      oneCharacterGivenNames: 2,
      twoCharacterGivenNames: 1,
      uniqueGivenCharacters: 3,
    });
    expect(corpus.frequencies.get('明')).toBe(2);
    expect(corpus.genderCounts.get('明')).toEqual({
      male: 1,
      female: 1,
      unknown: 0,
    });
  });

  it('只覆盖纯证据不足且达到频次和总分门槛的拒绝项', () => {
    const entry = (char) => ({ char, review: { decision: 'rejected' } });
    const corpus = {
      frequencies: new Map([
        ['甲', 5],
        ['乙', 4],
        ['丙', 100],
      ]),
    };
    const result = selectSecondSourceApprovals({
      batch: { entries: [entry('甲'), entry('乙'), entry('丙')] },
      audit: {
        entries: [
          { char: '甲', score: 50, ruleIds: ['neutral.score.below-approve-threshold'] },
          { char: '乙', score: 69, ruleIds: ['neutral.score.below-approve-threshold'] },
          { char: '丙', score: 69, ruleIds: ['neutral.semantic.negative'] },
        ],
      },
      corpus,
    });

    expect(result.approvals.map(({ entry: item }) => item.char)).toEqual(['甲']);
    expect(result.retained).toEqual({
      explicitOrHardReject: 1,
      insufficientEvidence: 1,
    });
  });
});
