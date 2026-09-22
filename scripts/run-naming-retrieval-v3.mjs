import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const includeHoldout = process.argv.includes('--holdout');
const splits = includeHoldout ? ['train', 'validation', 'holdout'] : ['train', 'validation'];
const runCount = 3;

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function metricGate(current, baseline, threshold) {
  const regressions = threshold.noRegressionMetrics.filter(
    (metric) => current[metric] + Number.EPSILON < baseline[metric],
  );
  const improvements = threshold.mustImproveOneOf.filter(
    (metric) => current[metric] - baseline[metric] >= threshold.strictImprovementDelta,
  );
  return { passed: regressions.length === 0 && improvements.length > 0, regressions, improvements };
}

const server = await createServer({
  root,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true },
});

try {
  const [
    { createNamingBenchmarkRun, validateFrozenBenchmark },
    { generateNamesV2, rankNamingCharacters },
    { generateNamesV3WithDiagnostics },
    { selectRetrievalCandidates },
    { searchNamePairs, cheapPairScore },
    { filterCharacterPool },
    { passesPairFilter },
    { passesHomophoneFilter },
    { assessSemanticPair },
    { assessHomophone },
    { assessPhonetics },
    { scoreName },
    { normalizeNamingStyles },
    { createClassicPhraseIndex, mergeClassicImageryRegistry },
  ] = await Promise.all([
    server.ssrLoadModule('/src/core/naming/benchmark.ts'),
    server.ssrLoadModule('/src/core/naming/nameGenerator.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/index.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/candidateSelector.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/pairSearch.ts'),
    server.ssrLoadModule('/src/core/naming/filters/characterFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/pairFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/homophoneFilter.ts'),
    server.ssrLoadModule('/src/core/naming/semanticPair.ts'),
    server.ssrLoadModule('/src/core/naming/homophone.ts'),
    server.ssrLoadModule('/src/core/naming/phonetic.ts'),
    server.ssrLoadModule('/src/core/naming/scorer.ts'),
    server.ssrLoadModule('/src/config/namingStyles.ts'),
    server.ssrLoadModule('/src/core/classics/classicRepository.ts'),
  ]);
  const datasets = await Promise.all(
    splits.map((split) => readJson(`docs/naming-benchmark/benchmark-v1.${split}.json`)),
  );
  const allFrozenDatasets = includeHoldout
    ? datasets
    : [...datasets, await readJson('docs/naming-benchmark/benchmark-v1.holdout.json')];
  const issues = validateFrozenBenchmark(allFrozenDatasets);
  if (issues.length) throw new Error(`冻结数据未通过校验：${issues.slice(0, 5).join('；')}`);

  const [characterSource, pronunciations, classicIndex, baseline, threshold] = await Promise.all([
    readJson('public/data/characters/recommended-v2.json'),
    readJson('public/data/characters/pronunciations.json'),
    readJson('public/data/classics/index.json'),
    readJson('docs/naming-benchmark/reports/baseline-v2.ai.json'),
    readJson('docs/naming-benchmark/reports/thresholds-v1.ai.json'),
  ]);
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
  const sourceScenarios = datasets[0].scenarios;
  const scenarioResults = new Map();
  const scenarioDiagnostics = [];

  for (const scenario of sourceScenarios) {
    const options = {
      surname: scenario.surname,
      characters,
      tendencies: scenario.fixedTendencies,
      pronunciations,
      classicWorks,
      preference: scenario.preference,
      limit: scenario.resultLimit,
    };
    const selection = selectRetrievalCandidates({
      characters,
      tendencies: scenario.fixedTendencies,
      preference: scenario.preference,
      classicCharacters,
    });
    const pairResult = searchNamePairs({
      ...options,
      characters: selection.candidates,
      beamWidthPerFirst: 30,
    });
    const retrievedNames = new Set(pairResult.retrievedGivenNames);
    const selectedCharacters = new Set(
      selection.candidates.map(({ char }) => char),
    );
    const legacyRanked = rankNamingCharacters(
      filterCharacterPool(characters, scenario.preference),
      scenario.fixedTendencies,
      scenario.preference,
    );
    const legacyCharacters = new Set(legacyRanked.slice(0, 240).map(({ char }) => char));
    const v2Durations = [];
    const v3Durations = [];
    const v2HeapDeltas = [];
    const v3HeapDeltas = [];
    const v2Outputs = [];
    const v3Outputs = [];
    const v3Diagnostics = [];
    generateNamesV2(options);
    generateNamesV3WithDiagnostics(options);
    for (let run = 0; run < runCount; run += 1) {
      let heapBefore = process.memoryUsage().heapUsed;
      let startedAt = performance.now();
      v2Outputs.push(generateNamesV2(options));
      v2Durations.push(performance.now() - startedAt);
      v2HeapDeltas.push(Math.max(0, process.memoryUsage().heapUsed - heapBefore));
      heapBefore = process.memoryUsage().heapUsed;
      startedAt = performance.now();
      const v3 = generateNamesV3WithDiagnostics(options);
      v3Durations.push(performance.now() - startedAt);
      v3HeapDeltas.push(Math.max(0, process.memoryUsage().heapUsed - heapBefore));
      v3Outputs.push(v3.names);
      v3Diagnostics.push(v3.diagnostics);
    }
    const v2Hashes = v2Outputs.map((output) => sha256(output.map(({ givenName, score }) => ({ givenName, score }))));
    const v3Hashes = v3Outputs.map((output) => sha256(output.map(({ givenName, score }) => ({ givenName, score }))));
    const deterministic = new Set(v3Hashes).size === 1 &&
      new Set(v3Diagnostics.map(({ resultSignature }) => resultSignature)).size === 1;
    const v2Best = Math.max(0, ...v2Outputs[0].map(({ score }) => score));
    const v3Best = Math.max(0, ...v3Outputs[0].map(({ score }) => score));
    const v2Top20 = v2Outputs[0].slice(0, 20).map(({ givenName }) => givenName);
    const v3Top20 = v3Outputs[0].slice(0, 20).map(({ givenName }) => givenName);
    const labelledNames = datasets.flatMap(({ scenarios }) => scenarios)
      .filter(({ id }) => id === scenario.id)
      .flatMap(({ candidates }) => candidates.map(({ givenName }) => givenName));
    const selectedByCharacter = new Map(
      selection.candidates.map((character) => [character.char, character]),
    );
    const labelledBeamRanks = Object.fromEntries(labelledNames.map((givenName) => {
      const [firstChar, secondChar] = [...givenName];
      const first = selectedByCharacter.get(firstChar);
      const second = selectedByCharacter.get(secondChar);
      if (!first || !second) {
        return [givenName, { firstSelected: Boolean(first), secondSelected: Boolean(second), rank: null }];
      }
      const rankedSeconds = selection.candidates.map((candidate) => ({
        character: candidate.char,
        score: cheapPairScore(
          first,
          candidate,
          assessSemanticPair(first, candidate).score,
          scenario.fixedTendencies,
          scenario.preference,
        ),
      })).sort((left, right) =>
        right.score - left.score || left.character.localeCompare(right.character, 'zh-CN'));
      return [givenName, {
        firstSelected: true,
        secondSelected: true,
        rank: rankedSeconds.findIndex(({ character }) => character === secondChar) + 1,
      }];
    }));
    scenarioDiagnostics.push({
      id: scenario.id,
      selectedCharacterCount: selection.candidates.length,
      consideredPairCount: pairResult.consideredPairCount,
      fullScoreCandidateCount: pairResult.fullScoreCandidateCount,
      v2ResultCount: v2Outputs[0].length,
      v3ResultCount: v3Outputs[0].length,
      v2MedianMs: round(median(v2Durations)),
      v3MedianMs: round(median(v3Durations)),
      v2PeakHeapDeltaBytes: Math.max(...v2HeapDeltas),
      v3PeakHeapDeltaBytes: Math.max(...v3HeapDeltas),
      maxScoreRegret: round(Math.max(0, v2Best - v3Best)),
      top20Overlap: v3Top20.filter((name) => v2Top20.includes(name)).length,
      v2OutputHash: v2Hashes[0],
      v3OutputHash: v3Hashes[0],
      retrievalSignature: v3Diagnostics[0].resultSignature,
      deterministic,
      labelledRetrievalComparison: {
        v2: labelledNames.filter((givenName) =>
          [...givenName].every((character) => legacyCharacters.has(character))),
        v3CandidateSpace: labelledNames.filter((givenName) =>
          [...givenName].every((character) => selectedCharacters.has(character))),
        v3Beam: labelledNames.filter((givenName) => retrievedNames.has(givenName)),
      },
      labelledBeamRanks,
    });

    const surnamePronunciations = [...scenario.surname]
      .map((char) => pronunciationMap.get(char)).filter(Boolean);
    const surnamePinyin = surnamePronunciations.map(({ pinyin }) => pinyin);
    const surnameStrokes = surnamePronunciations.map(({ strokes }) => strokes)
      .filter((value) => typeof value === 'number');
    const eligibleSet = new Set(filterCharacterPool(characters, scenario.preference).map(({ char }) => char));
    const allJudgements = datasets.flatMap(({ scenarios }) => scenarios)
      .filter(({ id }) => id === scenario.id).flatMap(({ candidates }) => candidates);
    scenarioResults.set(scenario.id, allJudgements.map(({ givenName }) => {
      const [firstChar, secondChar] = [...givenName];
      const first = byCharacter.get(firstChar);
      const second = byCharacter.get(secondChar);
      if (!first || !second) throw new Error(`${scenario.id}/${givenName} 缺少 V3 字库资料`);
      const semantic = assessSemanticPair(first, second);
      const homophone = assessHomophone(surnamePinyin, [first.pinyin, second.pinyin]);
      const phonetic = assessPhonetics([
        ...surnamePronunciations.map(({ pinyin, tone }) => ({ pinyin, tone })),
        { pinyin: first.pinyin, tone: first.tone },
        { pinyin: second.pinyin, tone: second.tone },
      ]);
      const passedHardFilter = !first.negative && !second.negative &&
        passesPairFilter(first, second, semantic) && passesHomophoneFilter(homophone);
      const retrieved = passedHardFilter && eligibleSet.has(firstChar) &&
        eligibleSet.has(secondChar) && selectedCharacters.has(firstChar) &&
        selectedCharacters.has(secondChar) &&
        passesPairFilter(first, second, semantic, scenario.preference);
      const score = scoreName({
        characters: [first, second],
        tendencies: scenario.fixedTendencies,
        phonetic,
        homophone,
        surnameStrokes,
        classic: classicPhraseIndex.get(givenName),
        semantic,
      }).score;
      return { scenarioId: scenario.id, givenName, score, passedHardFilter, retrieved };
    }));
  }

  const runs = Object.fromEntries(datasets.map((dataset) => {
    const candidateKeys = new Set(dataset.scenarios.flatMap((scenario) =>
      scenario.candidates.map(({ givenName }) => `${scenario.id}\u0000${givenName}`)));
    const results = [...scenarioResults.values()].flat().filter(({ scenarioId, givenName }) =>
      candidateKeys.has(`${scenarioId}\u0000${givenName}`));
    return [dataset.split, createNamingBenchmarkRun({
      datasets: [dataset],
      results,
      evaluatedNamingModelVersion: 'V3-retrieval-shadow',
      dataVersion: dataset.scenarios[0].dataVersion,
      ruleVersion: dataset.scenarios[0].ruleVersion,
    })];
  }));
  const gates = Object.fromEntries(Object.entries(runs).map(([split, run]) => [
    split,
    metricGate(run.metrics, baseline.runs[split].metrics, threshold),
  ]));
  const deterministicPassed = scenarioDiagnostics.every(({ deterministic }) => deterministic);
  const v2MedianTotal = scenarioDiagnostics.reduce((total, item) => total + item.v2MedianMs, 0);
  const v3MedianTotal = scenarioDiagnostics.reduce((total, item) => total + item.v3MedianMs, 0);
  const performancePassed = v3MedianTotal <= v2MedianTotal;
  const qualityPassed = includeHoldout ? gates.holdout.passed :
    Object.values(gates).every(({ regressions }) => regressions.length === 0);
  const report = {
    schemaVersion: 1,
    benchmarkVersion: datasets[0].benchmarkVersion,
    mode: includeHoldout ? 'final-holdout' : 'development',
    evaluatedPath: 'V3 dynamic multi-label retrieval -> deterministic fill -> per-first Top-30 beam -> full score -> diversity; V2 retained for shadow comparison. Recall uses the same pre-full-score candidate-space boundary as the frozen V2 baseline.',
    evidenceBoundary: '质量指标来自 AI-only 代理标签；耗时只代表当前机器 Node 进程。候选空间 Recall 与 Beam 截断分开计算；max-score regret 比较最终候选最高分，不等同人工审美差异。',
    scenarioDiagnostics,
    runs,
    gates,
    summary: {
      qualityPassed,
      performancePassed,
      deterministicPassed,
      v2MedianTotalMs: round(v2MedianTotal),
      v3MedianTotalMs: round(v3MedianTotal),
      maxScoreRegret: Math.max(...scenarioDiagnostics.map(({ maxScoreRegret }) => maxScoreRegret)),
      defaultSwitchAllowed: includeHoldout && qualityPassed && performancePassed && deterministicPassed,
    },
  };
  const fileName = includeHoldout ? 'retrieval-v3.holdout.ai.json' : 'retrieval-v3.development.ai.json';
  const outputPath = path.join(root, 'docs', 'naming-benchmark', 'reports', fileName);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (!checkOnly) {
    await writeFile(outputPath, serialized, 'utf8');
  }
  if (!qualityPassed || !performancePassed || !deterministicPassed) {
    throw new Error(`V3 检索门禁未通过：quality=${qualityPassed} performance=${performancePassed} deterministic=${deterministicPassed}`);
  }
  console.log(`V3 检索${includeHoldout ? '最终 holdout' : '开发'}门禁通过：V2 ${round(v2MedianTotal)}ms / V3 ${round(v3MedianTotal)}ms。`);
} finally {
  await server.close();
}
