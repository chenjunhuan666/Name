/// <reference types="node" />

import { copyFile, readFile } from 'node:fs/promises';

const sourceUrl = new URL('../THIRD_PARTY_NOTICES.md', import.meta.url);
const publishedUrl = new URL('../public/THIRD_PARTY_NOTICES.md', import.meta.url);
const checkOnly = process.argv.includes('--check');

const source = await readFile(sourceUrl, 'utf8');

if (checkOnly) {
  const published = await readFile(publishedUrl, 'utf8').catch(() => '');
  if (published !== source) {
    throw new Error(
      'public/THIRD_PARTY_NOTICES.md 与根目录声明不一致，请运行 pnpm notices:sync',
    );
  }
} else {
  await copyFile(sourceUrl, publishedUrl);
}
