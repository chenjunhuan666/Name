import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const runCount = 3;
const sourceFiles = [
  'src/config/namingScore.ts',
  'src/data/semanticRoles.ts',
  'src/core/naming/semanticPair.ts',
  'src/core/naming/scorer.ts',
  'src/core/naming/retrieval/candidateSelector.ts',
  'src/core/naming/retrieval/pairSearch.ts',
  'src/core/naming/retrieval/index.ts',
];

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableHash(value) {
  return sha256(JSON.stringify(value));
}

function round(value, digits = 4) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function compareMetrics(current, baseline) {
  return Object.fromEntries(Object.keys(current).map((metric) => [
    metric,
    round(current[metric] - baseline[metric]),
  ]));
}

async function currentInputHashes() {
  const holdoutRaw = await readText('docs/naming-benchmark/benchmark-v2.holdout.json');
  const sources = await Promise.all(sourceFiles.map(async (file) => [file, await readText(file)]));
  return {
    holdoutSha256: sha256(holdoutRaw),
    implementationSha256: sha256(sources.map(([file, content]) => `${file}\n${content}`).join('\n')),
  };
}

const reportPath = path.join(root, 'docs', 'naming-benchmark', 'reports', 'ranking-v4.holdout.ai.json');
if (checkOnly) {
  const report = await readJson('docs/naming-benchmark/reports/ranking-v4.holdout.ai.json');
  const inputHashes = await currentInputHashes();
  const evaluationPayload = {
    v2Run: report.v2Run,
    v4Run: report.v4Run,
    metricDeltas: report.metricDeltas,
    qualityGate: report.qualityGate,
    generationDiagnostics: report.generationDiagnostics,
    summary: report.summary,
  };
  const expectedSwitchAllowed = Boolean(
    report.summary?.qualityPassed &&
    report.summary?.performancePassed &&
    report.summary?.deterministicPassed,
  );
  if (report.mode !== 'final-independent-holdout' ||
      report.holdoutEvaluationCount !== 1 ||
      report.inputHashes?.holdoutSha256 !== inputHashes.holdoutSha256 ||
      report.inputHashes?.implementationSha256 !== inputHashes.implementationSha256 ||
      report.evaluationPayloadSha256 !== stableHash(evaluationPayload) ||
      report.summary?.defaultSwitchAllowed !== expectedSwitchAllowed) {
    throw new Error('Phase 4 一次性留出报告无效或评分实现已漂移');
  }
  console.log(`Phase 4 一次性留出报告完整性校验通过；未重新执行 holdout；准入=${expectedSwitchAllowed ? '通过' : '拒绝'}。`);
  process.exit(0);
}

const server = await createServer({
  root,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true },
});

try {
  const [
    { createNamingBenchmarkRun },
    { generateNamesV2, rankNamingCharacters },
    { generateNamesV3WithDiagnostics },
    { selectRetrievalCandidates },
    { assessSemanticPair, assessSemanticPairV3 },
    { scoreName, scoreNameV3 },
    { assessHomophone },
    { assessPhonetics },
    { passesPairFilter },
    { passesHomophoneFilter },
    { filterCharacterPool },
    { normalizeNamingStyles },
    { createClassicPhraseIndex, mergeClassicImageryRegistry },
  ] = await Promise.all([
    server.ssrLoadModule('/src/core/naming/benchmark.ts'),
    server.ssrLoadModule('/src/core/naming/nameGenerator.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/index.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/candidateSelector.ts'),
    server.ssrLoadModule('/src/core/naming/semanticPair.ts'),
    server.ssrLoadModule('/src/core/naming/scorer.ts'),
    server.ssrLoadModule('/src/core/naming/homophone.ts'),
    server.ssrLoadModule('/src/core/naming/phonetic.ts'),
    server.ssrLoadModule('/src/core/naming/filters/pairFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/homophoneFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/characterFilter.ts'),
    server.ssrLoadModule('/src/config/namingStyles.ts'),
    server.ssrLoadModule('/src/core/classics/classicRepository.ts'),
  ]);
  const [dataset, characterSource, pronunciations, classicIndex, thresholds] = await Promise.all([
    readJson('docs/naming-benchmark/benchmark-v2.holdout.json'),
    readJson('public/data/characters/recommended-v2.json'),
    readJson('public/data/characters/pronunciations.json'),
    readJson('public/data/classics/index.json'),
    readJson('docs/naming-benchmark/reports/thresholds-v1.ai.json'),
  ]);
  if (dataset.status !== 'frozen' || dataset.split !== 'holdout' ||
      dataset.reviewProtocol !== 'ai-only-v2' ||
      dataset.scenarios.reduce((sum, scenario) => sum + scenario.candidates.length, 0) !== 60) {
    throw new Error('Phase 4 独立留出集未正确冻结');
  }
  const characters = characterSource.filter(({ naming }) => naming?.suitable).map((character) => ({
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
    meaning: character.meanings.modern ?? character.meanings.classical ?? '释义待补充',
    gender: character.naming.gender,
    rarity: character.naming.rarity,
    styleTags: normalizeNamingStyles(character.naming.styleTags),
    negative: false,
  }));
  const byCharacter = new Map(characters.map((character) => [character.char, character]));
  const pronunciationMap = new Map(pronunciations.map((item) => [item.char, item]));
  const packageWorks = await Promise.all(classicIndex.packages
    .filter(({ available }) => available)
    .map(({ path: packagePath }) => readJson(`public/data/classics/${packagePath}`)));
  const imageryRegistry = await readJson(`public/data/classics/${classicIndex.imageryRegistry.path}`);
  const classicWorks = mergeClassicImageryRegistry(packageWorks.flat(), imageryRegistry);
  const classicPhraseIndex = createClassicPhraseIndex(classicWorks);
  const classicCharacters = new Set(classicWorks.flatMap((work) => [
    ...work.lines.flatMap((line) => [...line]),
    ...(work.imageryNames ?? []).flatMap(({ givenName }) => [...givenName]),
  ]));
  const v2Results = [];
  const v4Results = [];
  const generationDiagnostics = [];

  for (const scenario of dataset.scenarios) {
    const options = {
      surname: scenario.surname,
      characters,
      tendencies: scenario.fixedTendencies,
      pronunciations,
      classicWorks,
      preference: scenario.preference,
      limit: scenario.resultLimit,
    };
    const eligible = filterCharacterPool(characters, scenario.preference);
    const v2Selected = new Set(rankNamingCharacters(
      eligible,
      scenario.fixedTendencies,
      scenario.preference,
    ).slice(0, 240).map(({ char }) => char));
    const v4Selection = selectRetrievalCandidates({
      characters,
      tendencies: scenario.fixedTendencies,
      preference: scenario.preference,
      classicCharacters,
    });
    const v4Selected = new Set(v4Selection.candidates.map(({ char }) => char));
    const surnamePronunciations = [...scenario.surname]
      .map((character) => pronunciationMap.get(character)).filter(Boolean);
    const surnamePinyin = surnamePronunciations.map(({ pinyin }) => pinyin);
    const surnameStrokes = surnamePronunciations.map(({ strokes }) => strokes)
      .filter((value) => typeof value === 'number');

    for (const judgement of scenario.candidates) {
      const [firstChar, secondChar] = [...judgement.givenName];
      const first = byCharacter.get(firstChar);
      const second = byCharacter.get(secondChar);
      if (!first || !second) throw new Error(`${scenario.id}/${judgement.givenName} 缺少字库资料`);
      const homophone = assessHomophone(surnamePinyin, [first.pinyin, second.pinyin]);
      const phonetic = assessPhonetics([
        ...surnamePronunciations.map(({ pinyin, tone }) => ({ pinyin, tone })),
        { pinyin: first.pinyin, tone: first.tone },
        { pinyin: second.pinyin, tone: second.tone },
      ]);
      const commonScoreOptions = {
        characters: [first, second],
        tendencies: scenario.fixedTendencies,
        phonetic,
        homophone,
        surnameStrokes,
        classic: classicPhraseIndex.get(judgement.givenName),
      };
      const v2Semantic = assessSemanticPair(first, second);
      const v4Semantic = assessSemanticPairV3(first, second);
      const v2Passed = !first.negative && !second.negative &&
        passesPairFilter(first, second, v2Semantic) && passesHomophoneFilter(homophone);
      const v4Passed = !first.negative && !second.negative &&
        passesPairFilter(first, second, v4Semantic) && passesHomophoneFilter(homophone);
      v2Results.push({
        scenarioId: scenario.id,
        givenName: judgement.givenName,
        score: scoreName({ ...commonScoreOptions, semantic: v2Semantic }).score,
        passedHardFilter: v2Passed,
        retrieved: v2Passed && v2Selected.has(firstChar) && v2Selected.has(secondChar) &&
          passesPairFilter(first, second, v2Semantic, scenario.preference),
      });
      v4Results.push({
        scenarioId: scenario.id,
        givenName: judgement.givenName,
        score: scoreNameV3({ ...commonScoreOptions, semantic: v4Semantic }).score,
        passedHardFilter: v4Passed,
        retrieved: v4Passed && v4Selected.has(firstChar) && v4Selected.has(secondChar) &&
          passesPairFilter(first, second, v4Semantic, scenario.preference),
      });
    }

    generateNamesV2(options);
    generateNamesV3WithDiagnostics(options, { rankingModel: 'v3' });
    const v2Durations = [];
    const v4Durations = [];
    const v2Hashes = [];
    const v4Hashes = [];
    const signatures = [];
    let v4ResultCount = 0;
    for (let run = 0; run < runCount; run += 1) {
      let startedAt = performance.now();
      const v2Names = generateNamesV2(options);
      v2Durations.push(performance.now() - startedAt);
      startedAt = performance.now();
      const v4 = generateNamesV3WithDiagnostics(options, { rankingModel: 'v3' });
      v4Durations.push(performance.now() - startedAt);
      v4ResultCount = v4.names.length;
      v2Hashes.push(stableHash(v2Names.map(({ givenName, score }) => ({ givenName, score }))));
      v4Hashes.push(stableHash(v4.names.map(({ givenName, score }) => ({ givenName, score }))));
      signatures.push(v4.diagnostics.resultSignature);
    }
    generationDiagnostics.push({
      id: scenario.id,
      requestedResultCount: scenario.resultLimit,
      v4ResultCount,
      fulfilledResultLimit: v4ResultCount >= scenario.resultLimit,
      v2MedianMs: round(median(v2Durations), 2),
      v4MedianMs: round(median(v4Durations), 2),
      v2OutputHash: v2Hashes[0],
      v4OutputHash: v4Hashes[0],
      resultSignature: signatures[0],
      deterministic: new Set(v2Hashes).size === 1 && new Set(v4Hashes).size === 1 &&
        new Set(signatures).size === 1,
    });
  }

  const v2Run = createNamingBenchmarkRun({
    datasets: [dataset],
    results: v2Results,
    evaluatedNamingModelVersion: 'V2-production',
    dataVersion: dataset.scenarios[0].dataVersion,
    ruleVersion: dataset.scenarios[0].ruleVersion,
  });
  const v4Run = createNamingBenchmarkRun({
    datasets: [dataset],
    results: v4Results,
    evaluatedNamingModelVersion: 'V3.4-semantic-roles',
    dataVersion: dataset.scenarios[0].dataVersion,
    ruleVersion: dataset.scenarios[0].ruleVersion,
  });
  const regressions = thresholds.noRegressionMetrics.filter(
    (metric) => v4Run.metrics[metric] + Number.EPSILON < v2Run.metrics[metric],
  );
  const improvements = thresholds.mustImproveOneOf.filter(
    (metric) => v4Run.metrics[metric] - v2Run.metrics[metric] >= thresholds.strictImprovementDelta,
  );
  const qualityGate = { passed: regressions.length === 0 && improvements.length > 0, regressions, improvements };
  const v2MedianTotalMs = round(generationDiagnostics.reduce((sum, item) => sum + item.v2MedianMs, 0), 2);
  const v4MedianTotalMs = round(generationDiagnostics.reduce((sum, item) => sum + item.v4MedianMs, 0), 2);
  const deterministicPassed = generationDiagnostics.every(
    ({ deterministic, fulfilledResultLimit }) => deterministic && fulfilledResultLimit,
  );
  const performancePassed = v4MedianTotalMs <= v2MedianTotalMs;
  const summary = {
    qualityPassed: qualityGate.passed,
    performancePassed,
    deterministicPassed,
    v2MedianTotalMs,
    v4MedianTotalMs,
    defaultSwitchAllowed: qualityGate.passed && performancePassed && deterministicPassed,
  };
  const inputHashes = await currentInputHashes();
  const report = {
    schemaVersion: 1,
    benchmarkVersion: dataset.benchmarkVersion,
    mode: 'final-independent-holdout',
    holdoutEvaluationCount: 1,
    evaluatedModel: 'V3.4-semantic-roles',
    reviewProtocol: dataset.reviewProtocol,
    sourceReviewSha256: dataset.sourceReviewSha256,
    inputHashes,
    evidenceBoundary: '只读取新冻结的 60 条独立 AI-only holdout；这是一次性相对 V2 准入评估，不等价于人工审美、现实姓名安全、登记适用性或跨机器性能结论。',
    v2Run,
    v4Run,
    metricDeltas: compareMetrics(v4Run.metrics, v2Run.metrics),
    qualityGate,
    generationDiagnostics,
    summary,
  };
  report.evaluationPayloadSha256 = stableHash({
    v2Run: report.v2Run,
    v4Run: report.v4Run,
    metricDeltas: report.metricDeltas,
    qualityGate: report.qualityGate,
    generationDiagnostics: report.generationDiagnostics,
    summary: report.summary,
  });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ metricDeltas: report.metricDeltas, qualityGate, summary }, null, 2));
  if (!summary.defaultSwitchAllowed) {
    throw new Error(`Phase 4 独立 holdout 门禁未通过：${JSON.stringify(summary)}`);
  }
  console.log(`Phase 4 独立 holdout 门禁通过：V2 ${v2MedianTotalMs}ms / V4 ${v4MedianTotalMs}ms。`);
} finally {
  await server.close();
}
