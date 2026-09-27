import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_MODE = process.argv.includes('--check');
const RUN_COUNT = 30;
const WARMUP_COUNT = 3;

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function scaleCharacters(characters, size) {
  if (size <= characters.length) return characters.slice(0, size);
  const result = [...characters];
  const occupied = new Set(result.map(({ char }) => char));
  let codePoint = 0x3400;
  while (result.length < size) {
    const source = characters[(result.length - characters.length) % characters.length];
    while (occupied.has(String.fromCodePoint(codePoint))) codePoint += 1;
    const char = String.fromCodePoint(codePoint);
    occupied.add(char);
    result.push({ ...source, char });
    codePoint += 1;
  }
  return result;
}

async function measure(generateNames, optionsFactory) {
  for (let index = 0; index < WARMUP_COUNT; index += 1) generateNames(optionsFactory());
  const durations = [];
  const hashes = [];
  const heapBefore = process.memoryUsage().heapUsed;
  let peakHeap = heapBefore;
  for (let run = 0; run < RUN_COUNT; run += 1) {
    const started = performance.now();
    const names = generateNames(optionsFactory());
    durations.push(performance.now() - started);
    hashes.push(hash(names.map(({ givenName, score }) => ({ givenName, score }))));
    peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
  }
  if (new Set(hashes).size !== 1) throw new Error('Phase 7 性能场景输出不确定');
  return {
    runCount: RUN_COUNT,
    p50Ms: round(percentile(durations, 0.5)),
    p95Ms: round(percentile(durations, 0.95)),
    peakHeapDeltaBytes: Math.max(0, peakHeap - heapBefore),
    outputHash: hashes[0]
  };
}

const server = await createServer({ root: ROOT, logLevel: 'error', appType: 'custom', server: { middlewareMode: true } });
try {
  const [{ generateNamesV2 }, { normalizeNamingStyles }, { mergeClassicImageryRegistry }] = await Promise.all([
    server.ssrLoadModule('/src/core/naming/nameGenerator.ts'),
    server.ssrLoadModule('/src/config/namingStyles.ts'),
    server.ssrLoadModule('/src/core/classics/classicRepository.ts')
  ]);
  const [rawCharacters, pronunciations, classicIndex] = await Promise.all([
    readJson('public/data/characters/recommended-v2.json'),
    readJson('public/data/characters/pronunciations.json'),
    readJson('public/data/classics/index.json')
  ]);
  const characters = rawCharacters.filter(({ naming }) => naming.suitable).map((entry) => ({
    char: entry.char, pinyin: entry.pinyin, tone: entry.tone,
    element: entry.elements.alternatives?.length ? [entry.elements.primary, ...entry.elements.alternatives] : entry.elements.primary,
    elementConfidence: entry.elements.confidence, elementBasis: entry.elements.basis,
    radical: entry.radical, strokes: entry.strokes, traditionalStrokes: entry.traditionalStrokes,
    meaning: entry.meanings.modern ?? entry.meanings.classical ?? '释义待补充',
    gender: entry.naming.gender, rarity: entry.naming.rarity,
    recommendationTier: entry.naming.tier,
    styleTags: normalizeNamingStyles(entry.naming.styleTags), negative: false
  }));
  const packages = await Promise.all(classicIndex.packages.filter(({ available }) => available).map(({ path: itemPath }) => readJson(`public/data/classics/${itemPath}`)));
  const imagery = await readJson(`public/data/classics/${classicIndex.imageryRegistry.path}`);
  const classicWorks = mergeClassicImageryRegistry(packages.flat(), imagery);
  const scenarios = [
    { id: '2100-standard-30', size: 2100, limit: 30, preference: { styles: [], rarityPreference: 'balanced', genderExpression: 'neutral', classicPreference: 'none' } },
    { id: '2160-standard-60', size: 2160, limit: 60, preference: { styles: [], rarityPreference: 'balanced', genderExpression: 'neutral', classicPreference: 'none' } },
    { id: '2500-classic-filter', size: 2500, limit: 30, preference: { styles: [], rarityPreference: 'balanced', genderExpression: 'neutral', classicPreference: 'shijing' } },
    { id: '3000-include-character', size: 3000, limit: 30, preference: { styles: [], includeCharacters: ['清'], rarityPreference: 'balanced', genderExpression: 'neutral', classicPreference: 'none' } },
    { id: '3000-multi-style', size: 3000, limit: 60, preference: { styles: ['清雅', '儒雅'], rarityPreference: 'balanced', genderExpression: 'neutral', classicPreference: 'none' } }
  ];
  const reports = [];
  for (const scenario of scenarios) {
    const scaled = scaleCharacters(characters, scenario.size);
    const base = { surname: '陈', characters: scaled, pronunciations, preference: scenario.preference, limit: scenario.limit };
    const uncached = await measure(generateNamesV2, () => ({ ...base, classicWorks: [...classicWorks] }));
    const optimized = await measure(generateNamesV2, () => ({ ...base, classicWorks }));
    if (uncached.outputHash !== optimized.outputHash) throw new Error(`${scenario.id} 优化前后输出变化`);
    reports.push({
      ...scenario,
      dataMode: scenario.size > characters.length ? 'synthetic-capacity-only' : 'runtime-data',
      uncached,
      optimized,
      p95ChangePercent: round(((optimized.p95Ms - uncached.p95Ms) / uncached.p95Ms) * 100),
      deterministic: true,
      desktopDirectionalTargetMet: optimized.p95Ms < 300
    });
  }
  const report = {
    schemaVersion: 1,
    phase: 'Phase 7',
    runtime: { node: process.version, platform: process.platform, architecture: process.arch },
    protocol: { warmupCount: WARMUP_COUNT, runCount: RUN_COUNT, desktopDirectionalTargetMs: 300, mobileDirectionalTargetMs: 800 },
    optimization: '同一不可变典籍数组复用 A/B/C phrase index；不改变 V2 候选、评分、排序或输出 hash。',
    evidenceBoundary: '2500/3000 使用不进入运行时的合成字符扩容，只测容量开销；Node 数据不冒充移动端或浏览器体验。方向目标在设备与限速协议固定前不作为发布阻断。',
    scenarios: reports
  };
  if (!CHECK_MODE) await writeFile(path.join(ROOT, 'docs/releases/phase7-algorithm-performance.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Phase 7 algorithm benchmark passed: ${reports.length} scenarios × ${RUN_COUNT} cached/uncached runs.`);
} finally {
  await server.close();
}
