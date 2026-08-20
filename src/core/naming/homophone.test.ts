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
});
