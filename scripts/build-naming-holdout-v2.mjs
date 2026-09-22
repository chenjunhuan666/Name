import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'docs', 'naming-benchmark');
const checkOnly = process.argv.includes('--check');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

const fixedTendencies = ['木', '火', '土', '金', '水'].map((element, index) => ({
  element,
  level: 5 - index,
  relation: '日主所生',
  weightedPresence: index,
  reason: '隔离历法与八字算法，仅用于姓名质量审校',
}));
const scenarios = [
  ['balanced-chen', '陈', ['清雅'], 'balanced', 'neutral'],
  ['scholarly-li', '李', ['书卷'], 'common', 'neutral'],
  ['warm-wang', '王', ['温润'], 'balanced', 'feminine'],
  ['classic-zhang', '张', ['古典'], 'distinctive', 'masculine'],
  ['minimal-lin', '林', ['简约'], 'balanced', 'neutral'],
].map(([id, surname, styles, rarityPreference, genderExpression]) => ({
  id,
  benchmarkVersion: '2.0.0',
  surname,
  fixedTendencies,
  preference: { styles, rarityPreference, genderExpression },
  resultLimit: 20,
  dataVersion: '3.0.0',
  ruleVersion: '3.0.0',
}));
const [source, previousQueue] = await Promise.all([
  readJson('public/data/characters/recommended-v2.json'),
  readJson('docs/naming-benchmark/benchmark-v1.review-queue.json'),
]);
const characters = source.filter(({ naming }) => naming?.suitable).sort(
  (left, right) =>
    (right.naming?.usageScore ?? 0) - (left.naming?.usageScore ?? 0) ||
    (left.naming?.rarity ?? 1) - (right.naming?.rarity ?? 1) ||
    left.char.localeCompare(right.char, 'zh-CN'),
);
const excludedNames = new Set(previousQueue.candidates.map(({ givenName }) => givenName));
const excludedGroups = new Set(previousQueue.candidates.map(({ leakageGroupId }) => leakageGroupId));
const usedNames = new Set();
const usedGroups = new Set();
const candidates = [];

for (let index = 0; index < 60; index += 1) {
  const scenario = scenarios[index % scenarios.length];
  const stratum = index < 20 ? 'common' : index < 40 ? 'balanced' : 'distinctive';
  const poolStart = stratum === 'common' ? 0 : stratum === 'balanced' ? 300 : 1200;
  const poolLength = Math.min(600, characters.length - poolStart);
  let attempt = 0;
  let first;
  let second;
  let givenName;
  let leakageGroupId;
  do {
    first = characters[poolStart + ((index * 31 + attempt * 13 + 701) % poolLength)];
    second = characters[poolStart + ((index * 43 + attempt * 17 + 997) % poolLength)];
    givenName = `${first.char}${second.char}`;
    leakageGroupId = [...givenName].sort().join('');
    attempt += 1;
  } while (
    (first.char === second.char ||
      excludedNames.has(givenName) ||
      excludedGroups.has(leakageGroupId) ||
      usedNames.has(givenName) ||
      usedGroups.has(leakageGroupId)) &&
    attempt < 2_000
  );
  if (
    first.char === second.char ||
    excludedNames.has(givenName) ||
    excludedGroups.has(leakageGroupId) ||
    usedNames.has(givenName) ||
    usedGroups.has(leakageGroupId)
  ) {
    throw new Error(`无法为第 ${index + 1} 条记录生成独立候选`);
  }
  usedNames.add(givenName);
  usedGroups.add(leakageGroupId);
  candidates.push({
    id: `benchmark-v2-holdout-${String(index + 1).padStart(3, '0')}`,
    scenarioId: scenario.id,
    surname: scenario.surname,
    givenName,
    leakageGroupId,
    samplingStratum: stratum,
    sourceCharacterIds: [first.char, second.char],
  });
}

function packet(reviewerSlot) {
  return {
    schemaVersion: 1,
    benchmarkVersion: '2.0.0',
    status: 'source-packet-frozen',
    reviewerSlot,
    evidenceBoundary:
      '独立 AI-only holdout 审查输入；不得查看另一份审查、train/validation 标签、V2/V3/V4 分数或排名。只有明确硬风险才建议 hard-filter，事实不足必须保留 factGap。',
    scenarios,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      review: {
        reviewerId: null,
        expectedClass: null,
        tags: [],
        reasons: [],
        shouldPassHardFilter: null,
        factGap: null,
        reviewedAt: null,
      },
    })),
  };
}
const outputs = [
  ['benchmark-v2.holdout.review-queue.json', {
    schemaVersion: 1,
    benchmarkVersion: '2.0.0',
    status: 'source-queue-frozen',
    generatedFrom: 'public/data/characters/recommended-v2.json',
    excludedBenchmarkVersion: previousQueue.benchmarkVersion,
    evidenceBoundary:
      '60 条候选与 Benchmark V1 的姓名和无序双字 leakageGroupId 均不重叠；只用于 Phase 4 一次性最终 holdout。',
    scenarios,
    candidates,
  }],
  ['benchmark-v2.holdout.review-a.json', packet('A')],
  ['benchmark-v2.holdout.review-b.json', packet('B')],
];

for (const [fileName, value] of outputs) {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  const filePath = path.join(directory, fileName);
  if (checkOnly) {
    if (await readFile(filePath, 'utf8').catch(() => '') !== output) {
      throw new Error(`${fileName} 不是最新确定性结果`);
    }
  } else {
    await writeFile(filePath, output, 'utf8');
  }
}
console.log(`Benchmark V2 独立 holdout ${checkOnly ? '校验' : '生成'}完成：60 条，与 V1 姓名及语义组零重叠。`);
