import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(
  projectRoot,
  'public',
  'data',
  'characters',
  'recommended-v2.json',
);
const outputDirectory = path.join(
  projectRoot,
  'docs',
  'naming-benchmark',
);
const checkOnly = process.argv.includes('--check');

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
  benchmarkVersion: '1.0.0',
  surname,
  fixedTendencies,
  preference: { styles, rarityPreference, genderExpression },
  resultLimit: 20,
  dataVersion: '3.0.0',
  ruleVersion: '3.0.0',
}));

const source = JSON.parse(await readFile(sourcePath, 'utf8'))
  .filter((item) => item.naming?.suitable)
  .sort(
    (left, right) =>
      (right.naming?.usageScore ?? 0) - (left.naming?.usageScore ?? 0) ||
      (left.naming?.rarity ?? 1) - (right.naming?.rarity ?? 1) ||
      left.char.localeCompare(right.char, 'zh-CN'),
  );

if (source.length < 300) {
  throw new Error(`推荐字库只有 ${source.length} 字，无法建立 300 条审校队列`);
}

const usedNames = new Set();
const candidates = [];
for (let index = 0; index < 300; index += 1) {
  const scenario = scenarios[index % scenarios.length];
  const stratum = index < 100 ? 'common' : index < 200 ? 'balanced' : 'distinctive';
  const poolStart = stratum === 'common' ? 0 : stratum === 'balanced' ? 300 : 1200;
  const poolLength = Math.min(600, source.length - poolStart);
  let attempt = 0;
  let first;
  let second;
  let givenName;
  do {
    first = source[poolStart + ((index * 17 + attempt * 7) % poolLength)];
    second = source[poolStart + ((index * 29 + attempt * 11 + 13) % poolLength)];
    givenName = `${first.char}${second.char}`;
    attempt += 1;
  } while ((first.char === second.char || usedNames.has(givenName)) && attempt < 1_000);

  if (first.char === second.char || usedNames.has(givenName)) {
    throw new Error(`无法为第 ${index + 1} 条记录生成唯一双字名`);
  }
  usedNames.add(givenName);
  candidates.push({
    id: `benchmark-v1-review-${String(index + 1).padStart(3, '0')}`,
    scenarioId: scenario.id,
    surname: scenario.surname,
    givenName,
    leakageGroupId: [...givenName].sort().join(''),
    samplingStratum: stratum,
    sourceCharacterIds: [first.char, second.char],
    blindReviews: [
      {
        slot: 1,
        reviewerId: null,
        expectedClass: null,
        tags: [],
        reasons: [],
        shouldPassHardFilter: null,
        reviewedAt: null,
      },
      {
        slot: 2,
        reviewerId: null,
        expectedClass: null,
        tags: [],
        reasons: [],
        shouldPassHardFilter: null,
        reviewedAt: null,
      },
    ],
    adjudication: null,
  });
}

const coordinatorOutput = `${JSON.stringify(
  {
    schemaVersion: 1,
    benchmarkVersion: '1.0.0',
    status: 'source-queue-frozen',
    generatedFrom: 'public/data/characters/recommended-v2.json',
    evidenceBoundary:
      '本文件只保存确定性候选与两个独立审查槽；AI 审查、最终裁决和冻结数据分别保存在 reports 与 split 文件中。',
    scenarios,
    candidates,
  },
  null,
  2,
)}\n`;

function createBlindPacket(slot) {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      benchmarkVersion: '1.0.0',
      status: 'source-packet-frozen',
      reviewerSlot: slot,
      evidenceBoundary:
        '本文件是一个独立 AI 审查输入包；审查时不得查看另一包结果、算法分数或排名。',
      scenarios,
      candidates: candidates.map(
        ({ blindReviews: _blindReviews, adjudication: _adjudication, ...candidate }) => ({
          ...candidate,
          review: {
            reviewerId: null,
            expectedClass: null,
            tags: [],
            reasons: [],
            shouldPassHardFilter: null,
            reviewedAt: null,
          },
        }),
      ),
    },
    null,
    2,
  )}\n`;
}

const outputs = [
  ['benchmark-v1.review-queue.json', coordinatorOutput],
  ['benchmark-v1.review-a.json', createBlindPacket('A')],
  ['benchmark-v1.review-b.json', createBlindPacket('B')],
];

if (checkOnly) {
  const checks = await Promise.all(
    outputs.map(async ([fileName, output]) => {
      const current = await readFile(
        path.join(outputDirectory, fileName),
        'utf8',
      ).catch(() => '');
      return current === output;
    }),
  );
  if (checks.some((matches) => !matches)) {
    console.error('姓名 Benchmark 待审队列不是最新确定性结果。');
    process.exitCode = 1;
  } else {
    console.log(
      `姓名 Benchmark 协调队列及独立 AI 审查包校验通过：${candidates.length} 条。`,
    );
  }
} else {
  await Promise.all(
    outputs.map(([fileName, output]) =>
      writeFile(path.join(outputDirectory, fileName), output, 'utf8'),
    ),
  );
  console.log(
    `姓名 Benchmark 协调队列及独立 AI 审查包已生成：${candidates.length} 条。`,
  );
}
