import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyPronunciationCorrection } from './character-pronunciation-corrections.mjs';
import { validateReviewBatch } from './import-approved-character-reviews.mjs';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

export function scanPendingPairs({ batch, recommended, lexical, assessSemanticPair, passesSemanticFilter, assessHomophone }) {
  const partners = recommended.filter(({ naming }) => naming.suitable).map((entry) => ({
    char: entry.char, pinyin: entry.pinyin, tone: entry.tone,
    meaning: entry.meanings.modern ?? entry.meanings.classical ?? '释义待补充',
    styleTags: entry.naming.styleTags, negative: false,
  }));
  const evidenceByChar = new Map(lexical.entries.map((entry) => [entry.char, entry]));
  const entries = batch.entries.filter(({ review }) => review.decision === 'pending').map((entry) => {
    const evidence = evidenceByChar.get(entry.char);
    if (!evidence || JSON.stringify(evidence.sourceEvidence) !== JSON.stringify(entry.evidence)) {
      throw new Error(`待审字词典证据缺失或不同步：${entry.char}`);
    }
    if (partners.some(({ char }) => char === entry.char)) throw new Error(`待审字已进入运行时：${entry.char}`);
    const candidate = applyPronunciationCorrection({ char: entry.char,
      pinyin: entry.evidence.facts.pinyin, tone: entry.evidence.facts.tone,
      meaning: entry.evidence.source.meaning, styleTags: entry.evidence.source.styleTags,
      negative: false });
    const counts = { checked: 0, passed: 0, rejected: 0, semanticRejected: 0, homophoneRejected: 0, approximateWarnings: 0 };
    const rejected = [];
    const warnings = [];
    const samples = { first: [], second: [] };
    for (const partner of partners) {
      for (const [position, pair] of [['first', [candidate, partner]], ['second', [partner, candidate]]]) {
        const name = pair.map(({ char }) => char).join('');
        const semantic = assessSemanticPair(...pair);
        // Only given scope: surname/full scope requires a real surname and is
        // intentionally not inferred from an empty surname here.
        const homophones = assessHomophone([], pair.map(({ pinyin }) => pinyin)).details
          .filter(({ scope }) => scope === 'given');
        const semanticRejected = !passesSemanticFilter(semantic);
        const homophoneRejected = homophones.some(({ matchType }) => matchType === 'exact');
        const approximateWarning = homophones.some(({ matchType }) => matchType === 'approximate');
        counts.checked += 1;
        counts.semanticRejected += Number(semanticRejected);
        counts.homophoneRejected += Number(homophoneRejected);
        counts.approximateWarnings += Number(approximateWarning);
        if (semanticRejected || homophoneRejected) {
          counts.rejected += 1;
          rejected.push({ name, semanticRejected, homophoneRejected, homophones, semanticNotes: semantic.notes });
        } else {
          counts.passed += 1;
          if (approximateWarning) warnings.push({ name, homophones });
          // Bounded source-order samples, not a name ranking or endorsement.
          if (samples[position].length < 3) samples[position].push({ name,
            pinyin: pair.map(({ pinyin }) => pinyin), partnerMeaning: partner.meaning,
            semanticScore: semantic.score, approximateWarning });
        }
      }
    }
    return { char: entry.char, checkedPronunciation: { pinyin: candidate.pinyin, tone: candidate.tone },
      sourceMeaning: candidate.meaning, lexicalFlags: evidence.reviewFlags,
      previousSuggestion: evidence.previousSuggestion.suggestion,
      counts, rejected, warnings, samples, decision: 'pending' };
  });
  return { schemaVersion: 1, batchId: batch.batchId,
    policy: { nonBinding: true, decisionsChanged: 0, runtimeEffect: 'none',
      scope: 'both given-name positions, production semantic filter and given-scope homophone matches only',
      boundary: 'Candidate meanings/style tags are provisional source metadata; passing does not verify dictionary alignment, human naturalness, surname risks, preferences, phonetic scores or final generator ranking',
      samples: 'first three passing pairs per position in source order; not recommended names' },
    counts: { candidates: entries.length, enabledPartners: partners.length,
      ...entries.reduce((sum, entry) => Object.fromEntries(Object.entries(sum).map(([key, value]) => [key, value + entry.counts[key]])),
        { checked: 0, passed: 0, rejected: 0, semanticRejected: 0, homophoneRejected: 0, approximateWarnings: 0 }) }, entries };
}

export function toMarkdown(result) {
  return ['# 剩余待审字组合规则检查', '',
    `覆盖 ${result.counts.candidates} 字 × ${result.counts.enabledPartners} 个启用搭配字 × 2 个位置，共 ${result.counts.checked} 个组合；淘汰 ${result.counts.rejected} 个，通过 ${result.counts.passed} 个。`, '',
    '仅复用生产语义过滤及 given 范围谐音规则，不包含姓氏、方言、用户偏好、综合评分和最终生成排序。语义计数与谐音计数可能重叠，总淘汰数按组合去重。近音是提示，不自动作为硬淘汰。', '',
    '语义检查使用待审字原始来源释义和风格标签；通过表示未命中当前规则，不证明词典语义一致或人工自然度。样例取每个位置按字库原顺序前 3 个通过项，不是取名推荐。茸使用已核验的 róng/二声；旧词典报告的原始来源冲突提示继续保留。', '',
    '| 字 | 检查数 | 淘汰 | 语义淘汰 | 谐音淘汰 | 近音提示 | 字在前的阅读样例 | 字在后的阅读样例 |',
    '|---|---:|---:|---:|---:|---:|---|---|',
    ...result.entries.map((entry) => `| ${entry.char} | ${entry.counts.checked} | ${entry.counts.rejected} | ${entry.counts.semanticRejected} | ${entry.counts.homophoneRejected} | ${entry.counts.approximateWarnings} | ${entry.samples.first.map(({ name }) => name).join('、')} | ${entry.samples.second.map(({ name }) => name).join('、')} |`), '',
    '完整淘汰组合、近音提示、样例读音和输入 SHA-256 见同名 JSON。审校决定与运行时数据不变。', ''].join('\n');
}

export async function main() {
  const files = ['docs/recommended-character-review-batch-01.json', 'docs/recommended-character-review.json',
    'docs/recommended-character-pending-evidence-batch-01.json', 'public/data/characters/recommended-v2.json',
    'src/core/naming/semanticPair.ts', 'src/core/naming/filters/semanticFilter.ts', 'src/core/naming/homophone.ts',
    'src/core/naming/phonetic.ts', 'src/data/namingConstraints.ts', 'src/data/badHomophones.ts',
    'scripts/character-pronunciation-corrections.mjs', 'scripts/build-pending-character-pairs.mjs'];
  const texts = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  const batch = JSON.parse(texts[0]);
  validateReviewBatch(batch, texts[1]);
  const lexical = JSON.parse(texts[2]);
  if (lexical.sources.find(({ path: sourcePath }) => sourcePath === files[0])?.sha256 !== sha256(texts[0])) {
    throw new Error('词典证据对应的审校批次已变化，请先重建词典证据');
  }
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { assessSemanticPair } = await server.ssrLoadModule('/src/core/naming/semanticPair.ts');
    const { passesSemanticFilter } = await server.ssrLoadModule('/src/core/naming/filters/semanticFilter.ts');
    const { assessHomophone } = await server.ssrLoadModule('/src/core/naming/homophone.ts');
    const result = scanPendingPairs({ batch, lexical, recommended: JSON.parse(texts[3]), assessSemanticPair, passesSemanticFilter, assessHomophone });
    result.sources = files.map((file, index) => ({ path: file, sha256: sha256(texts[index]) }));
    await writeFile('docs/recommended-character-pending-pairs-batch-01.json', `${JSON.stringify(result, null, 2)}\n`);
    await writeFile('docs/recommended-character-pending-pairs-batch-01.md', toMarkdown(result));
    console.log(JSON.stringify(result.counts));
    return result;
  } finally { await server.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
