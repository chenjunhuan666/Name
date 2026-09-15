import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseUnihanReadings } from './build-character-independent-review.mjs';
import { parseCedict } from './build-character-suitability-review.mjs';
import { validateReviewBatch } from './import-approved-character-reviews.mjs';

const unihanSha256 = '575e69c9ad85a4737a889a4f94cbd987042a90a1a6cc16dd3f4ed995c715b17c';
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Preserve tones and ü when comparing single-character dictionary readings.
export function numericPinyin(value) {
  const decomposed = value.trim().toLowerCase().normalize('NFD');
  const marks = ['\u0304', '\u0301', '\u030c', '\u0300'];
  const tone = decomposed.match(/[1-5]$/u)?.[0] ?? String(marks.findIndex((mark) => decomposed.includes(mark)) + 1 || 5);
  return decomposed.replace(/u\u0308/gu, 'v').replace(/u:/gu, 'v')
    .replace(/[\u0304\u0301\u030c\u0300]/gu, '').replace(/[1-5]$/u, '') + tone;
}

export function collectPendingEvidence({ batch, unihan, cedict, guidance }) {
  const previous = new Map(guidance.entries.map((entry) => [entry.char, entry]));
  return batch.entries.filter(({ review }) => review.decision === 'pending').map((entry) => {
    const lexical = unihan.get(entry.char);
    const dictionaryEntries = cedict.get(entry.char) ?? [];
    const unihanReadings = lexical?.kMandarin?.trim().split(/\s+/u) ?? [];
    const cedictReadings = [...new Set(dictionaryEntries.map(({ pinyin }) => pinyin))];
    const expected = numericPinyin(entry.evidence.facts.pinyin);
    const matches = (readings) => readings.some((reading) => numericPinyin(reading) === expected);
    const gaps = [];
    if (!lexical?.kDefinition) gaps.push('unihan-definition-missing');
    if (!unihanReadings.length) gaps.push('unihan-reading-missing');
    else if (!matches(unihanReadings)) gaps.push('unihan-reading-mismatch');
    if (!dictionaryEntries.length) gaps.push('cedict-entry-missing');
    else if (!matches(cedictReadings)) gaps.push('cedict-reading-mismatch');
    const readings = [...new Set([...unihanReadings, ...cedictReadings].map(numericPinyin))];
    if (readings.length > 1) gaps.push('multiple-dictionary-readings');
    const prior = previous.get(entry.char);
    if (!prior || JSON.stringify(prior.evidence) !== JSON.stringify(entry.evidence)) {
      throw new Error(`Historical guidance evidence mismatch: ${entry.char}`);
    }
    return { char: entry.char, sourceEvidence: entry.evidence,
      unihan: { definition: lexical?.kDefinition ?? null, readings: unihanReadings },
      cedict: dictionaryEntries, dictionaryReadings: readings,
      reviewFlags: gaps, previousSuggestion: prior.guidance,
      nextAction: gaps.length ? 'resolve-lexical-or-reading-flags' : 'human-meaning-and-naming-review',
      decision: 'pending' };
  });
}

export function toMarkdown(result) {
  const escape = (value) => String(value).replaceAll('|', '\\|').replace(/[\r\n]+/gu, ' ');
  return ['# 首批剩余候选字词典证据', '',
    `本次覆盖 ${result.counts.pending} 个待审字；已批准字排除。${result.counts.withFlags} 字有词典缺项、读音差异或多读音提示；${result.counts.withoutFlags} 字未触发这些提示。`, '',
    '本报告保留固定来源释义与独立词典原文，不自动认定词义一致、适合取名或批准。多读音包括专名/姓氏读音；词典释义内部注明的地区读音也需人工阅读，未穷举提取。旧建议仍是基于旧证据的建议，不能当作本次独立结论。', '',
    '来源：Unicode Unihan 17.0.0（https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip）；MDBG CC-CEDICT 2026-09-03（https://www.mdbg.net/chinese/dictionary?page=cc-cedict）。CC-CEDICT 摘录及结构化转换按 CC BY-SA 4.0（https://creativecommons.org/licenses/by-sa/4.0/）提供，修改包括按待审字筛选、拆分词条及汇总读音。输入哈希见同名 JSON。', '',
    '| 字 | 来源释义 / 读音 | Unihan 释义 / 读音 | CC-CEDICT 词条 | 提示 | 旧建议 |',
    '|---|---|---|---|---|---|',
    ...result.entries.map((entry) => `| ${entry.char} | ${escape(entry.sourceEvidence.source.meaning)} / ${entry.sourceEvidence.facts.pinyin} | ${escape(entry.unihan.definition ?? '缺失')} / ${entry.unihan.readings.join('、')} | ${escape(entry.cedict.map(({ pinyin, definitions }) => `${pinyin}: ${definitions.join('; ')}`).join(' / ') || '缺失')} | ${entry.reviewFlags.join(', ') || '无机器提示'} | ${entry.previousSuggestion.suggestion} |`), '',
    '报告不改变审校决定和运行时数据；无机器提示不代表全名安全或自然度合格。', ''].join('\n');
}

export async function main(args = process.argv.slice(2)) {
  if (args.length < 2) throw new Error('请提供固定 Unihan_Readings.txt 和 CC-CEDICT 解压文本路径');
  const files = [args[0], args[1], 'docs/recommended-character-review-batch-01.json',
    'docs/recommended-character-review.json', 'docs/recommended-character-review-guidance-batch-01.json'];
  const texts = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  if (sha256(texts[0]) !== unihanSha256) throw new Error('Unihan SHA-256 differs from fixed snapshot');
  const batch = JSON.parse(texts[2]);
  validateReviewBatch(batch, texts[3]);
  const entries = collectPendingEvidence({ batch, unihan: parseUnihanReadings(texts[0]),
    cedict: parseCedict(texts[1]), guidance: JSON.parse(texts[4]) });
  const result = { schemaVersion: 1, batchId: batch.batchId,
    sources: files.map((file, index) => ({ path: index < 2 ? path.basename(file) : file, sha256: sha256(texts[index]) })),
    attribution: { unihan: 'Unicode Unihan 17.0.0; https://www.unicode.org/terms_of_use.html',
      cedict: 'MDBG CC-CEDICT 2026-09-03; CC BY-SA 4.0; https://www.mdbg.net/chinese/dictionary?page=cc-cedict' },
    policy: { nonBinding: true, runtimeEffect: 'none', decisionsChanged: 0,
      boundary: 'Dictionary evidence only; no automatic semantic alignment, naming suitability or exhaustive alternative pronunciation claim' },
    counts: { pending: entries.length, excludedApproved: batch.counts.approved, excludedRejected: batch.counts.rejected,
      withFlags: entries.filter(({ reviewFlags }) => reviewFlags.length).length,
      withoutFlags: entries.filter(({ reviewFlags }) => !reviewFlags.length).length }, entries };
  await writeFile('docs/recommended-character-pending-evidence-batch-01.json', `${JSON.stringify(result, null, 2)}\n`);
  await writeFile('docs/recommended-character-pending-evidence-batch-01.md', toMarkdown(result));
  console.log(JSON.stringify(result.counts));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
