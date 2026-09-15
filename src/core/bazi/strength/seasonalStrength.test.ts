import { describe, expect, it } from 'vitest';
import { resolveSeasonalPhase } from './seasonalStrength';

describe('resolveSeasonalPhase', () => {
  it('按当令五行区分旺相休囚死', () => {
    expect(resolveSeasonalPhase('木', '木')).toBe('旺');
    expect(resolveSeasonalPhase('火', '木')).toBe('相');
    expect(resolveSeasonalPhase('水', '木')).toBe('休');
    expect(resolveSeasonalPhase('土', '木')).toBe('囚');
    expect(resolveSeasonalPhase('金', '木')).toBe('死');
  });
});
