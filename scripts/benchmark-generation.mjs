import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const runCount = 3;

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

const server = await createServer({
  root: projectRoot,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true },
});

try {
  const [{ generateNames }, { normalizeNamingStyles }, { mergeClassicImageryRegistry }] =
    await Promise.all([
      server.ssrLoadModule('/src/core/naming/nameGenerator.ts'),
      server.ssrLoadModule('/src/config/namingStyles.ts'),
      server.ssrLoadModule('/src/core/classics/classicRepository.ts'),
    ]);
  const [characterSource, pronunciations, classicIndex, reviewQueue] =
    await Promise.all([
      readJson('public/data/characters/recommended-v2.json'),
      readJson('public/data/characters/pronunciations.json'),
      readJson('public/data/classics/index.json'),
      readJson('docs/naming-benchmark/benchmark-v1.review-queue.json'),
    ]);
  const characters = characterSource
    .filter((character) => character.naming?.suitable)
    .map((character) => ({
      char: character.char,
      pinyin: character.pinyin,
      tone: character.tone,
      element: character.elements.alternatives?.length
        ? [character.elements.primary, ...character.elements.alternatives]
        : character.elements.primary,
      elementConfidence: character.elements.confidence,
      elementBasis: character.elements.basis,
      radical: character.radical,
      strokes: character.strokes,
      traditionalStrokes: character.traditionalStrokes,
      meaning:
        character.meanings.modern ?? character.meanings.classical ?? '释义待补充',
      gender: character.naming.gender,
      rarity: character.naming.rarity,
      styleTags: normalizeNamingStyles(character.naming.styleTags),
      negative: false,
    }));
  const packageWorks = await Promise.all(
    classicIndex.packages
      .filter(({ available }) => available)
      .map(({ path: packagePath }) =>
        readJson(`public/data/classics/${packagePath}`),
      ),
  );
  const imageryRegistry = await readJson(
    `public/data/classics/${classicIndex.imageryRegistry.path}`,
  );
  const classicWorks = mergeClassicImageryRegistry(
    packageWorks.flat(),
    imageryRegistry,
  );

  const scenarioReports = [];
  for (const scenario of reviewQueue.scenarios) {
    const options = {
      surname: scenario.surname,
      characters,
      tendencies: scenario.fixedTendencies,
      pronunciations,
      classicWorks,
      preference: scenario.preference,
      limit: scenario.resultLimit,
    };
    generateNames(options);
    const durationsMs = [];
    const outputs = [];
    for (let run = 0; run < runCount; run += 1) {
      const startedAt = performance.now();
      const names = generateNames(options);
      durationsMs.push(performance.now() - startedAt);
      outputs.push(
        names.map(({ givenName, score }) => ({ givenName, score })),
      );
    }
    const outputHashes = outputs.map(sha256);
    const deterministic = new Set(outputHashes).size === 1;
    if (!deterministic) {
      throw new Error(`${scenario.id} 在相同输入下产生了不一致结果`);
    }
    scenarioReports.push({
      id: scenario.id,
      surname: scenario.surname,
      resultLimit: scenario.resultLimit,
      runCount,
      candidateCount: outputs[0].length,
      fulfilledResultLimit: outputs[0].length >= scenario.resultLimit,
      medianMs: Math.round(percentile(durationsMs, 0.5) * 100) / 100,
      p95Ms: Math.round(percentile(durationsMs, 0.95) * 100) / 100,
      outputHash: outputHashes[0],
      deterministic,
      top20: outputs[0],
    });
  }

  const deterministicOutput = scenarioReports.map(
    ({ id, candidateCount, fulfilledResultLimit, outputHash, deterministic }) => ({
      id,
      candidateCount,
      fulfilledResultLimit,
      outputHash,
      deterministic,
    }),
  );
  const report = {
    schemaVersion: 1,
    benchmarkVersion: reviewQueue.benchmarkVersion,
    evaluatedPath: 'V2 production generator retained for Name V3 Phase 2',
    dataVersion: reviewQueue.scenarios[0]?.dataVersion ?? 'unknown',
    ruleVersion: reviewQueue.scenarios[0]?.ruleVersion ?? 'unknown',
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    evidenceBoundary:
      '该报告只记录固定场景的生成耗时、确定性与输出 hash；人工标签冻结前不计算质量 baseline 或正式阈值。',
    scenarioReports,
    deterministicOutputHash: sha256(deterministicOutput),
  };

  if (!checkOnly) {
    await writeFile(
      path.join(
        projectRoot,
        'docs',
        'naming-benchmark',
        'reports',
        'generation-v2.json',
      ),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  }
  console.log(
    `V2 生成基准完成：${scenarioReports.length} 个场景，确定性 hash ${report.deterministicOutputHash}。`,
  );
} finally {
  await server.close();
}
