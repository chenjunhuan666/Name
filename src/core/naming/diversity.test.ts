import { describe, expect, it } from 'vitest';
import type { ClassicSource, FiveElement, GeneratedName } from '../../types';
import { rerankForDiversity } from './diversity';

function candidate(
  givenName: string,
  elements: [FiveElement, FiveElement],
  source?: ClassicSource,
): GeneratedName {
  return {
    givenName,
    elements,
    classic: source
      ? {
          source,
          workId: `${source}-test`,
          book: '测试',
          title: '测试',
          text: '测试',
          display: '测试',
        }
      : undefined,
  } as unknown as GeneratedName;
}

describe('rerankForDiversity', () => {
  it('默认限制首字、次字、五行对与典籍来源的重复数量', () => {
    const names = [
      candidate('甲一', ['木', '火'], 'shijing'),
      candidate('甲二', ['木', '火'], 'shijing'),
      candidate('甲三', ['木', '火'], 'shijing'),
      candidate('甲四', ['木', '火'], 'shijing'),
      candidate('甲五', ['木', '火'], 'shijing'),
      candidate('乙六', ['木', '火'], 'shijing'),
      candidate('丙七', ['木', '火'], 'shijing'),
      candidate('丁八', ['水', '土'], 'zhouyi'),
    ];
    const result = rerankForDiversity(names, names.length);

    expect(result.filter(({ givenName }) => givenName.startsWith('甲'))).toHaveLength(4);
    expect(result.filter(({ elements }) => elements.join('-') === '木-火')).toHaveLength(6);
    expect(result.filter(({ classic }) => classic?.source === 'shijing')).toHaveLength(6);
  });

  it('支持自定义阈值且相同输入始终得到相同次序', () => {
    const names = [
      candidate('甲一', ['木', '火'], 'shijing'),
      candidate('甲二', ['水', '土'], 'zhouyi'),
      candidate('乙一', ['金', '水'], 'zhuangzi'),
      candidate('乙二', ['水', '土'], 'zhouyi'),
      candidate('丙三', ['土', '金'], 'chuci'),
    ];
    const options = {
      firstCharacterLimit: 1,
      secondCharacterLimit: 1,
      elementPairLimit: 1,
      classicSourceLimit: 1,
    };
    const first = rerankForDiversity(names, 5, options);
    const second = rerankForDiversity(names, 5, options);

    expect(first.map(({ givenName }) => givenName)).toEqual(['甲一', '乙二', '丙三']);
    expect(second).toEqual(first);
  });
});
