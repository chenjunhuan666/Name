/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { NamingCharacterV2 } from '../types';
import { NAMING_STYLE_OPTIONS, normalizeNamingStyles } from './namingStyles';

const source = JSON.parse(
  readFileSync(
    new URL('../../public/data/characters/recommended-v2.json', import.meta.url),
    'utf8',
  ),
) as NamingCharacterV2[];

describe('V2 九类起名风格', () => {
  it('把来源旧标签稳定翻译到对外九类，并保证每类都有运行时数据', () => {
    const normalized = source
      .filter(({ naming }) => naming.suitable)
      .map(({ naming }) => normalizeNamingStyles(naming.styleTags));
    const counts = Object.fromEntries(
      NAMING_STYLE_OPTIONS.map((style) => [
        style,
        normalized.filter((styles) => styles.includes(style)).length,
      ]),
    );

    expect(Object.keys(counts)).toEqual(NAMING_STYLE_OPTIONS);
    expect(Object.values(counts).every((count) => count > 0)).toBe(true);
    expect(
      normalized.every((styles) =>
        styles.every((style) => NAMING_STYLE_OPTIONS.includes(style)),
      ),
    ).toBe(true);
  });
});
