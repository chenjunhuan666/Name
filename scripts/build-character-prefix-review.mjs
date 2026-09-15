import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Inject the production functions so the offline report cannot drift into a
// second implementation of the pronunciation normalization or matching rules.
export function buildPrefixReview({ pronunciations, recommended, review, assessHomophone, normalizePinyin }) {
  const prefixes = new Map();
  const excluded = [];
  // The generator also resolves duplicate characters with last-record-wins.
  const records = [...new Map(pronunciations.map((entry) => [entry.char, entry])).values()];
  for (const entry of records) {
    if (typeof entry.pinyin !== 'string' || !normalizePinyin(entry.pinyin)) {
      excluded.push(entry.char);
      continue;
    }
    const key = normalizePinyin(entry.pinyin);
    const group = prefixes.get(key) ?? { pinyin: entry.pinyin, characters: [] };
    group.characters.push(entry.char);
    prefixes.set(key, group);
  }
  const partners = recommended.filter((entry) => entry.naming.suitable);
  const entries = review.entries.filter((entry) => ['颀', '铖'].includes(entry.char)).map((candidate) => {
    const matches = [];
    let evaluations = 0;
    for (const partner of partners) {
      for (const pair of [[candidate.sourceEvidence, partner], [partner, candidate.sourceEvidence]]) {
        const givenName = pair.map((entry) => entry.char ?? candidate.char).join('');
        const givenPinyin = pair.map((entry) => entry.pinyin);
        for (const prefix of prefixes.values()) {
          evaluations += 1;
          const details = assessHomophone([prefix.pinyin], givenPinyin).details
            .filter((detail) => detail.scope !== 'given');
          if (details.length) matches.push({ givenName, givenPinyin, prefixPinyin: prefix.pinyin,
            prefixCharacters: prefix.characters, details });
        }
      }
    }
    return { char: candidate.char, givenNamePairs: partners.length * 2, evaluations, matches };
  });
  if (entries.length !== 2) throw new Error('Expected both 颀 and 铖 in suitability review');
  return {
    schemaVersion: 1,
    policy: {
      scope: 'Single-character prefixes from the runtime pronunciation table; not a verified surname inventory',
      matching: 'Production assessHomophone; full and surname-first scopes; both candidate positions',
      exclusions: ['compound surnames', 'surname-specific or alternative readings', 'dialects', 'naturalness', 'negative expressions absent from current rules'],
      approvalBoundary: 'Generic character approval is separate from full-name assessment. A specific surname is not a prerequisite for generic review; a named human must still make the final character decision.',
      runtimeEffect: 'none', finalDecisionsWritten: 0,
    },
    coverage: { sourceRecords: pronunciations.length, uniquePrefixCharacters: records.length,
      normalizedPrefixGroups: prefixes.size, excludedCharacters: excluded, enabledPartners: partners.length },
    entries,
  };
}

export async function main() {
  const files = ['public/data/characters/pronunciations.json', 'public/data/characters/recommended-v2.json',
    'docs/recommended-character-suitability-review-batch-01.json', 'src/core/naming/homophone.ts',
    'src/core/naming/phonetic.ts', 'src/data/badHomophones.ts'];
  const texts = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { assessHomophone } = await server.ssrLoadModule('/src/core/naming/homophone.ts');
    const { normalizePinyin } = await server.ssrLoadModule('/src/core/naming/phonetic.ts');
    const result = buildPrefixReview({ pronunciations: JSON.parse(texts[0]), recommended: JSON.parse(texts[1]),
      review: JSON.parse(texts[2]), assessHomophone, normalizePinyin });
    result.sources = files.map((file, index) => ({ path: file,
      sha256: createHash('sha256').update(texts[index]).digest('hex') }));
    const lines = ['# 候选字单字前缀谐音复核', '',
      '使用运行时读音表和生产 assessHomophone 扫描；表中字符不能统称为已验证姓氏。', '',
      `读音记录 ${result.coverage.sourceRecords}；归并读音 ${result.coverage.normalizedPrefixGroups}；启用搭配字 ${result.coverage.enabledPartners}；缺失读音 ${result.coverage.excludedCharacters.length}。`, '',
      '| 字 | 双字组合数 | 读音组检查次数 | 姓氏相关规则命中组数 |', '|---|---:|---:|---:|',
      ...result.entries.map((entry) => `| ${entry.char} | ${entry.givenNamePairs} | ${entry.evaluations} | ${entry.matches.length} |`), '',
      '完整命中前缀、名字、读音和规则详情见同名 JSON。given 规则已由适用性报告检查，本报告仅汇总 full / surname-first。', '',
      '覆盖边界：复姓、姓氏专用读音、其他异读、方言、自然度、当前规则表未列出的负面表达均未验证。零命中只代表当前规则未命中。', '',
      '泛用推荐字的人工审批与具体全名评估分开处理；指定一个具体姓氏不是泛用字库审核的前置条件。当前最终决定仍为 0，运行时字库无变化。', ''];
    await writeFile('docs/recommended-character-prefix-review-batch-01.json', `${JSON.stringify(result, null, 2)}\n`);
    await writeFile('docs/recommended-character-prefix-review-batch-01.md', lines.join('\n'));
    console.log(JSON.stringify({ coverage: result.coverage, entries: result.entries.map(({ matches, ...entry }) => ({ ...entry, matchedGroups: matches.length })) }));
    return result;
  } finally {
    await server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
