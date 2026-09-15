/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('发布包第三方声明', () => {
  it('发布副本与根目录审计源完全一致', () => {
    expect(read('public/THIRD_PARTY_NOTICES.md')).toBe(
      read('THIRD_PARTY_NOTICES.md'),
    );
  });

  it('关于页可访问声明和三类必要许可材料', () => {
    const about = read('public/about.html');
    expect(about).toContain('./THIRD_PARTY_NOTICES.md');
    expect(about).toContain('./licenses/Apache-2.0.txt');
    expect(about).toContain('./licenses/MIT-NOTICES.txt');
    expect(about).toContain('./licenses/CC-BY-SA-4.0.txt');
    expect(read('public/licenses/Apache-2.0.txt')).toContain(
      'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
    );
    expect(read('public/licenses/MIT-NOTICES.txt')).toContain(
      'Copyright (c) 2024 FOR-BAZI Contributors',
    );
    expect(read('public/licenses/MIT-NOTICES.txt')).toContain(
      'jaywcjlove/table-of-general-standard-chinese-characters',
    );
    expect(read('public/licenses/CC-BY-SA-4.0.txt')).toContain(
      'https://creativecommons.org/licenses/by-sa/4.0/legalcode',
    );
  });
});
