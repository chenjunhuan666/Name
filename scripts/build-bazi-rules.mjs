import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = process.argv[2] ?? 'src/data/bazi/rules.json';
const outputRoot = process.argv[3] ?? 'public/data/bazi';
const catalog = JSON.parse(await readFile(sourcePath, 'utf8'));

if (!Array.isArray(catalog.references) || !Array.isArray(catalog.rules)) {
  throw new Error('规则源必须同时包含 references 和 rules 数组');
}

function assertUnique(items, label) {
  const ids = items.map(({ id }) => id);
  if (ids.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new Error(`${label} 存在空 id`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} 存在重复 id`);
  }
}

assertUnique(catalog.references, '参考文献');
assertUnique(catalog.rules, '命理规则');

const referenceIds = new Set(catalog.references.map(({ id }) => id));
catalog.rules.forEach((rule) => {
  if (!Array.isArray(rule.referenceIds) || rule.referenceIds.length === 0) {
    throw new Error(`规则 ${rule.id} 未关联参考文献`);
  }
  rule.referenceIds.forEach((referenceId) => {
    if (!referenceIds.has(referenceId)) {
      throw new Error(`规则 ${rule.id} 引用了未登记来源 ${referenceId}`);
    }
  });
});

await mkdir(outputRoot, { recursive: true });
await writeFile(
  path.join(outputRoot, 'references.json'),
  `${JSON.stringify(
    { schemaVersion: catalog.schemaVersion, references: catalog.references },
    null,
    2,
  )}\n`,
  'utf8',
);
await writeFile(
  path.join(outputRoot, 'rules.json'),
  `${JSON.stringify(
    { schemaVersion: catalog.schemaVersion, rules: catalog.rules },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(
  `已生成 ${catalog.references.length} 条参考文献和 ${catalog.rules.length} 条命理规则：${outputRoot}`,
);
