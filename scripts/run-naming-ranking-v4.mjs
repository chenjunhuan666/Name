import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const trialOnly = process.argv.includes('--trial');
const roleScaleArgument = process.argv.find((argument) => argument.startsWith('--role-scale='));
const roleScale = roleScaleArgument ? Number(roleScaleArgument.split('=')[1]) : 1;
if (!Number.isFinite(roleScale) || roleScale < 0 || roleScale > 1) {
  throw new Error('role-scale 必须是 0 到 1 之间的数字');
}
const splits = ['train', 'validation'];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}

function compareMetrics(current, baseline) {
  return Object.fromEntries(Object.keys(current).map((metric) => [
    metric,
    round(current[metric] - baseline[metric]),
  ]));
}

function gate(current, baseline, thresholds) {
  const regressions = thresholds.noRegressionMetrics.filter(
    (metric) => current[metric] + Number.EPSILON < baseline[metric],
  );
  const improvements = thresholds.mustImproveOneOf.filter(
    (metric) => current[metric] - baseline[metric] >= thresholds.strictImprovementDelta,
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
    { createNamingBenchmarkRun },
    { assessSemanticPairV3 },
    { scoreNameV3 },
    { assessHomophone },
    { assessPhonetics },
    { passesPairFilter },
    { passesHomophoneFilter },
    { filterCharacterPool },
    { selectRetrievalCandidates },
    { generateNamesV3WithDiagnostics },
    { normalizeNamingStyles },
    { createClassicPhraseIndex, mergeClassicImageryRegistry },
  ] = await Promise.all([
    server.ssrLoadModule('/src/core/naming/benchmark.ts'),
    server.ssrLoadModule('/src/core/naming/semanticPair.ts'),
    server.ssrLoadModule('/src/core/naming/scorer.ts'),
    server.ssrLoadModule('/src/core/naming/homophone.ts'),
    server.ssrLoadModule('/src/core/naming/phonetic.ts'),
    server.ssrLoadModule('/src/core/naming/filters/pairFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/homophoneFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/characterFilter.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/candidateSelector.ts'),
    server.ssrLoadModule('/src/core/naming/retrieval/index.ts'),
    server.ssrLoadModule('/src/config/namingStyles.ts'),
    server.ssrLoadModule('/src/core/classics/classicRepository.ts'),
  ]);
  const [datasets, characterSource, pronunciations, classicIndex, phase3, thresholds] = await Promise.all([
    Promise.all(splits.map((split) => readJson(`docs/naming-benchmark/benchmark-v1.${split}.json`))),
    readJson('public/data/characters/recommended-v2.json'),
    readJson('public/data/characters/pronunciations.json'),
    readJson('public/data/classics/index.json'),
    readJson('docs/naming-benchmark/reports/retrieval-v3.development.ai.json'),
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
  const scenarioResults = new Map();
  const relationCounts = new Map();
  const classScores = new Map();
  const generationDiagnostics = [];

  for (const scenario of datasets[0].scenarios) {
    const selection = selectRetrievalCandidates({
      characters,
      tendencies: scenario.fixedTendencies,
      preference: scenario.preference,
      classicCharacters,
    });
    const generationOptions = {
      surname: scenario.surname,
      characters,
      tendencies: scenario.fixedTendencies,
      pronunciations,
      classicWorks,
      preference: scenario.preference,
      limit: scenario.resultLimit,
    };
    const generated = generateNamesV3WithDiagnostics(generationOptions, {
      rankingModel: 'v3',
    });
    const generatedAgain = generateNamesV3WithDiagnostics(generationOptions, {
      rankingModel: 'v3',
    });
    generationDiagnostics.push({
      id: scenario.id,
      resultCount: generated.names.length,
      requestedResultCount: scenario.resultLimit,
      fulfilledResultLimit: generated.names.length >= scenario.resultLimit,
      uniqueFirstCharacterCount: new Set(
        generated.names.map(({ givenName }) => [...givenName][0]),
      ).size,
      uniqueSecondCharacterCount: new Set(
        generated.names.map(({ givenName }) => [...givenName][1]),
      ).size,
      uniqueElementPairCount: new Set(
        generated.names.map(({ elements }) => elements.slice(0, 2).join('-')),
      ).size,
      resultSignature: generated.diagnostics.resultSignature,
      deterministic:
        generated.diagnostics.resultSignature ===
        generatedAgain.diagnostics.resultSignature,
      phase3ResultCount:
        phase3.scenarioDiagnostics.find(({ id }) => id === scenario.id)
          ?.v3ResultCount ?? null,
    });
    const selectedCharacters = new Set(selection.candidates.map(({ char }) => char));
    const surnamePronunciations = [...scenario.surname]
      .map((character) => pronunciationMap.get(character)).filter(Boolean);
    const surnamePinyin = surnamePronunciations.map(({ pinyin }) => pinyin);
    const surnameStrokes = surnamePronunciations.map(({ strokes }) => strokes)
      .filter((value) => typeof value === 'number');
    const eligibleSet = new Set(filterCharacterPool(characters, scenario.preference).map(({ char }) => char));
    const judgements = datasets.flatMap(({ scenarios }) => scenarios)
      .filter(({ id }) => id === scenario.id).flatMap(({ candidates }) => candidates);
    const results = judgements.map((judgement) => {
      const [firstChar, secondChar] = [...judgement.givenName];
      const first = byCharacter.get(firstChar);
      const second = byCharacter.get(secondChar);
      if (!first || !second) throw new Error(`${scenario.id}/${judgement.givenName} 缺少字库资料`);
      const semantic = assessSemanticPairV3(first, second, roleScale);
      const homophone = assessHomophone(surnamePinyin, [first.pinyin, second.pinyin]);
      const phonetic = assessPhonetics([
        ...surnamePronunciations.map(({ pinyin, tone }) => ({ pinyin, tone })),
        { pinyin: first.pinyin, tone: first.tone },
        { pinyin: second.pinyin, tone: second.tone },
      ]);
      const passedHardFilter = !first.negative && !second.negative &&
        passesPairFilter(first, second, semantic) && passesHomophoneFilter(homophone);
      const retrieved = passedHardFilter && eligibleSet.has(firstChar) && eligibleSet.has(secondChar) &&
        selectedCharacters.has(firstChar) && selectedCharacters.has(secondChar) &&
        passesPairFilter(first, second, semantic, scenario.preference);
      const score = scoreNameV3({
        characters: [first, second],
        tendencies: scenario.fixedTendencies,
        phonetic,
        homophone,
        surnameStrokes,
        classic: classicPhraseIndex.get(judgement.givenName),
        semantic,
      }, roleScale).score;
      relationCounts.set(semantic.roleRelation, (relationCounts.get(semantic.roleRelation) ?? 0) + 1);
      const scores = classScores.get(judgement.expectedClass) ?? [];
      scores.push(score);
      classScores.set(judgement.expectedClass, scores);
      return { scenarioId: scenario.id, givenName: judgement.givenName, score, passedHardFilter, retrieved };
    });
    scenarioResults.set(scenario.id, results);
  }

  const runs = Object.fromEntries(datasets.map((dataset) => {
    const candidateKeys = new Set(dataset.scenarios.flatMap((scenario) =>
      scenario.candidates.map(({ givenName }) => `${scenario.id}\u0000${givenName}`)));
    const results = [...scenarioResults.values()].flat().filter(({ scenarioId, givenName }) =>
      candidateKeys.has(`${scenarioId}\u0000${givenName}`));
    return [dataset.split, createNamingBenchmarkRun({
      datasets: [dataset],
      results,
      evaluatedNamingModelVersion: 'V3.4-semantic-roles',
      dataVersion: dataset.scenarios[0].dataVersion,
      ruleVersion: dataset.scenarios[0].ruleVersion,
    })];
  }));
  const gates = Object.fromEntries(splits.map((split) => [
    split,
    gate(runs[split].metrics, phase3.runs[split].metrics, thresholds),
  ]));
  const trainSafetyRegressions = gates.train.regressions.filter((metric) =>
    ['rejectRecall', 'rejectPrecision'].includes(metric));
  const generationGatePassed = generationDiagnostics.every(
    ({ fulfilledResultLimit, deterministic }) =>
      fulfilledResultLimit && deterministic,
  );
  const report = {
    schemaVersion: 1,
    benchmarkVersion: datasets[0].benchmarkVersion,
    evaluatedModel: 'V3.4-semantic-roles',
    roleScale,
    evaluatedSplits: splits,
    holdoutRead: false,
    evidenceBoundary: '仅使用 train 调整并以 validation 选择方案；本脚本不读取 holdout。语义角色来自项目内字义和显式规则，只作排序软信号，不能替代人工审美或现实姓名安全判断。',
    semanticRoleRelationCounts: Object.fromEntries([...relationCounts.entries()].sort()),
    averageScoresByClass: Object.fromEntries([...classScores.entries()].sort().map(([key, values]) => [
      key,
      round(values.reduce((sum, value) => sum + value, 0) / values.length),
    ])),
    runs,
    metricDeltasFromPhase3: Object.fromEntries(splits.map((split) => [
      split,
      compareMetrics(runs[split].metrics, phase3.runs[split].metrics),
    ])),
    gates,
    selectionPolicy: 'train 用于尺度调参；validation 七项不退化且至少一项核心指标改善；train 的 Reject Recall/Precision 不得退化。',
    trainSafetyRegressions,
    generationDiagnostics,
    generationGatePassed,
    selected:
      trainSafetyRegressions.length === 0 &&
      gates.validation.passed &&
      generationGatePassed,
  };
  const outputPath = path.join(root, 'docs', 'naming-benchmark', 'reports', 'ranking-v4.development.ai.json');
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (checkOnly) {
    if (await readFile(outputPath, 'utf8').catch(() => '') !== serialized) {
      throw new Error('Phase 4 train/validation 排名报告不是最新确定性结果');
    }
  } else if (!trialOnly) {
    await writeFile(outputPath, serialized, 'utf8');
  }
  console.log(JSON.stringify({ roleScale, metricDeltasFromPhase3: report.metricDeltasFromPhase3, gates }, null, 2));
  if (!report.selected) {
    throw new Error(`Phase 4 排名方案未通过 validation 选择门禁：${JSON.stringify(gates)}`);
  }
  console.log(`Phase 4 排名开发门禁通过：train ${runs.train.metrics.pairwiseAccuracy} / validation ${runs.validation.metrics.pairwiseAccuracy}`);
} finally {
  await server.close();
}
