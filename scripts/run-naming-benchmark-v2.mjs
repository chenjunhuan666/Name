import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
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
    { rankNamingCharacters, generateNames },
    { filterCharacterPool },
    { passesPairFilter },
    { passesHomophoneFilter },
    { assessSemanticPair },
    { assessHomophone },
    { assessPhonetics },
    { scoreName },
    { normalizeNamingStyles },
    { createClassicPhraseIndex, mergeClassicImageryRegistry },
    { GENERATOR_LIMITS },
  ] = await Promise.all([
    server.ssrLoadModule('/src/core/naming/benchmark.ts'),
    server.ssrLoadModule('/src/core/naming/nameGenerator.ts'),
    server.ssrLoadModule('/src/core/naming/filters/characterFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/pairFilter.ts'),
    server.ssrLoadModule('/src/core/naming/filters/homophoneFilter.ts'),
    server.ssrLoadModule('/src/core/naming/semanticPair.ts'),
    server.ssrLoadModule('/src/core/naming/homophone.ts'),
    server.ssrLoadModule('/src/core/naming/phonetic.ts'),
    server.ssrLoadModule('/src/core/naming/scorer.ts'),
    server.ssrLoadModule('/src/config/namingStyles.ts'),
    server.ssrLoadModule('/src/core/classics/classicRepository.ts'),
    server.ssrLoadModule('/src/config/namingScore.ts'),
  ]);
  const datasets = await Promise.all(['train', 'validation', 'holdout'].map(
    (split) => readJson(`docs/naming-benchmark/benchmark-v1.${split}.json`),
  ));
  const issues = validateFrozenBenchmark(datasets);
  if (issues.length) throw new Error(`冻结数据未通过校验：${issues.slice(0, 5).join('；')}`);

  const [characterSource, pronunciations, classicIndex] = await Promise.all([
    readJson('public/data/characters/recommended-v2.json'),
    readJson('public/data/characters/pronunciations.json'),
    readJson('public/data/classics/index.json'),
  ]);
  const characters = characterSource.filter(({ naming }) => naming?.suitable)
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
  const imageryRegistry = await readJson(
    `public/data/classics/${classicIndex.imageryRegistry.path}`,
  );
  const classicWorks = mergeClassicImageryRegistry(packageWorks.flat(), imageryRegistry);
  const classicPhraseIndex = createClassicPhraseIndex(classicWorks);
  const sourceScenarios = datasets[0].scenarios;
  const scenarioResults = new Map();
  const scenarioDiagnostics = [];

  for (const scenario of sourceScenarios) {
    const surnamePronunciations = [...scenario.surname]
      .map((char) => pronunciationMap.get(char)).filter(Boolean);
    if (surnamePronunciations.length !== [...scenario.surname].length) {
      throw new Error(`${scenario.id} 缺少姓氏读音，无法生成可比的 V2 基线`);
    }
    const surnamePinyin = surnamePronunciations.map(({ pinyin }) => pinyin);
    const surnameStrokes = surnamePronunciations.map(({ strokes }) => strokes)
      .filter((value) => typeof value === 'number');
    const eligible = filterCharacterPool(characters, scenario.preference);
    const ranked = rankNamingCharacters(eligible, scenario.fixedTendencies, scenario.preference);
    const firstPool = new Set(ranked.slice(0, GENERATOR_LIMITS.firstCharacterTopK)
      .map(({ char }) => char));
    const secondPool = new Set(ranked.slice(0, GENERATOR_LIMITS.secondCharacterTopK)
      .map(({ char }) => char));
    const eligibleSet = new Set(eligible.map(({ char }) => char));
    const output = generateNames({
      surname: scenario.surname,
      characters,
      tendencies: scenario.fixedTendencies,
      pronunciations,
      classicWorks,
      preference: scenario.preference,
      limit: scenario.resultLimit,
    });
    scenarioDiagnostics.push({
      id: scenario.id,
      productionResultCount: output.length,
      requestedResultCount: scenario.resultLimit,
      fullCandidateSpace: `${GENERATOR_LIMITS.firstCharacterTopK}x${GENERATOR_LIMITS.secondCharacterTopK} ranked character pool before output limit/diversity`,
    });

    const allJudgements = datasets.flatMap(({ scenarios }) => scenarios)
      .filter(({ id }) => id === scenario.id).flatMap(({ candidates }) => candidates);
    const results = allJudgements.map(({ givenName }) => {
      const [firstChar, secondChar] = [...givenName];
      const first = byCharacter.get(firstChar);
      const second = byCharacter.get(secondChar);
      if (!first || !second) throw new Error(`${scenario.id}/${givenName} 缺少 V2 字库资料`);
      const semantic = assessSemanticPair(first, second);
      const homophone = assessHomophone(surnamePinyin, [first.pinyin, second.pinyin]);
      const phonetic = assessPhonetics([
        ...surnamePronunciations.map(({ pinyin, tone }) => ({ pinyin, tone })),
        { pinyin: first.pinyin, tone: first.tone },
        { pinyin: second.pinyin, tone: second.tone },
      ]);
      const passedHardFilter = !first.negative && !second.negative &&
        passesPairFilter(first, second, semantic) &&
        passesHomophoneFilter(homophone);
      const retrieved = passedHardFilter && eligibleSet.has(firstChar) &&
        eligibleSet.has(secondChar) && firstPool.has(firstChar) &&
        secondPool.has(secondChar) &&
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
    });
    const resultMap = new Map(results.map(({ givenName, ...rest }) => [givenName, rest]));
    for (const generated of output) {
      if (resultMap.has(generated.givenName) &&
          !resultMap.get(generated.givenName).retrieved) {
        throw new Error(`${scenario.id}/${generated.givenName} 生产输出未进入完整检索空间`);
      }
    }
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
      evaluatedNamingModelVersion: 'V2-production',
      dataVersion: dataset.scenarios[0].dataVersion,
      ruleVersion: dataset.scenarios[0].ruleVersion,
    })];
  }));
  const report = {
    schemaVersion: 1,
    benchmarkVersion: datasets[0].benchmarkVersion,
    reviewProtocol: 'ai-only-v1',
    sourceReviewSha256: datasets[0].sourceReviewSha256,
    evaluatedPath: 'V2 production filters and scorer on fixed candidates; full top-240x240 retrieval space before output limit/diversity',
    evidenceBoundary: 'AI-only 标签是代理指标；59 条事实缺口按无明确硬风险暂不拦截的测试约定处理。该报告不能证明中文姓名事实、安全、登记适用性或 V3 优于 V2。',
    scenarioDiagnostics,
    runs,
  };
  const reportDirectory = path.join(root, 'docs', 'naming-benchmark', 'reports');
  const outputPath = path.join(reportDirectory, 'baseline-v2.ai.json');
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const holdoutMetrics = runs.holdout.metrics;
  const thresholds = {
    schemaVersion: 1,
    benchmarkVersion: datasets[0].benchmarkVersion,
    status: 'frozen',
    reviewProtocol: 'ai-only-v1',
    basedOnModel: runs.holdout.evaluatedNamingModelVersion,
    basedOnHoldoutOutputHash: runs.holdout.outputHash,
    minimums: holdoutMetrics,
    noRegressionMetrics: Object.keys(holdoutMetrics),
    mustImproveOneOf: [
      'top20Precision',
      'top20Recall',
      'ndcg20',
      'rejectRecall',
      'rejectPrecision',
      'pairwiseAccuracy',
    ],
    strictImprovementDelta: 0.0001,
    evidenceBoundary: '正式门槛是相对 V2 的 AI-only 代理门槛。基线为 0 的指标仍要求不退化，但 0 不代表质量达标；后续模型还必须至少改善一个预声明核心指标。',
  };
  const thresholdsPath = path.join(reportDirectory, 'thresholds-v1.ai.json');
  const serializedThresholds = `${JSON.stringify(thresholds, null, 2)}\n`;
  if (checkOnly) {
    if (await readFile(outputPath, 'utf8').catch(() => '') !== serialized ||
        await readFile(thresholdsPath, 'utf8').catch(() => '') !== serializedThresholds) {
      throw new Error('V2 AI-only 质量基线报告不是最新确定性结果');
    }
  } else {
    await writeFile(outputPath, serialized, 'utf8');
    await writeFile(thresholdsPath, serializedThresholds, 'utf8');
  }
  console.log(`V2 AI-only 姓名质量基线${checkOnly ? '校验' : '生成'}完成：${Object.entries(runs).map(([split, run]) => `${split} ${run.candidateCount}`).join(' / ')}`);
} finally {
  await server.close();
}
