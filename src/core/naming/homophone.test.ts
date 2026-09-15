import { describe, expect, it } from 'vitest';
import { assessHomophone } from './homophone';

describe('assessHomophone', () => {
  it('过滤姓与名连读形成的明显负面谐音', () => {
    const result = assessHomophone(['shǐ'], ['zhēn', 'xiāng']);

    expect(result.safe).toBe(false);
    expect(result.matches).toContain('屎真香');
  });

  it('普通组合保持安全并返回规范化拼音', () => {
    const result = assessHomophone(['chén'], ['jǐng', 'hé']);

    expect(result.safe).toBe(true);
    expect(result.score).toBe(100);
    expect(result.normalizedFullName).toBe('chenjinghe');
  });

  it('检查姓与第一字形成的负面词', () => {
    const result = assessHomophone(['dù'], ['zǐ', 'hán']);

    expect(result.safe).toBe(false);
    expect(result.details).toContainEqual({
      label: '肚子',
      scope: 'surname-first',
      category: 'negative',
      matchType: 'exact',
    });
  });

  it('近似拼音作为软提示降分但不触发硬过滤', () => {
    const result = assessHomophone(['lǐ'], ['bǎi', 'cí']);

    expect(result.safe).toBe(true);
    expect(result.score).toBe(65);
    expect(result.matches).toContain('白痴（近音）');
  });

  it('识别名字两字中的常见网络负面词', () => {
    const result = assessHomophone(['chén'], ['bǎi', 'làn']);

    expect(result.safe).toBe(false);
    expect(result.details).toContainEqual({
      label: '摆烂',
      scope: 'given',
      category: 'internet',
      matchType: 'exact',
    });
  });
});
