import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_MODE = process.argv.includes('--check');
const JSON_INDENT = 2;

const THEME_RULES = {
  品德: ['德', '仁', '义', '礼', '善', '诚', '信', '贤', '孝', '君子', '廉'],
  志向: ['志', '凌', '远', '进', '成', '立', '业', '鹏', '鸿', '自强'],
  智慧: ['智', '慧', '知', '明', '哲', '学', '思', '文', '敏', '察'],
  自然: ['风', '云', '雨', '雪', '花', '木', '林', '草', '月', '日', '星', '春', '秋'],
  山水: ['山', '水', '江', '河', '海', '泉', '溪', '湖', '川', '峰', '洲'],
  光明: ['光', '明', '昭', '景', '晖', '旭', '阳', '曜', '朗', '照'],
  平和: ['和', '宁', '安', '静', '平', '泰', '恬', '柔', '清'],
  坚毅: ['坚', '毅', '刚', '健', '强', '恒', '勇', '韧', '不息'],
  自由: ['逍遥', '游', '逸', '自在', '无为', '忘', '化'],
  仁爱: ['爱', '慈', '惠', '恕', '民', '亲', '怜', '恩']
};

const SOURCE_FALLBACK_THEME = {
  shijing: '自然',
  chuci: '志向',
  lunyu: '品德',
  mengzi: '仁爱',
  zhouyi: '坚毅',
  zhuangzi: '自由',
  tang: '自然',
  songci: '平和'
};

const SOURCE_STYLES = {
  shijing: ['清雅', '古典'],
  chuci: ['大气', '古典'],
  lunyu: ['儒雅', '书卷'],
  mengzi: ['儒雅', '大气'],
  zhouyi: ['古典', '大气'],
  zhuangzi: ['自然', '古典'],
  tang: ['书卷', '大气'],
  songci: ['清雅', '温润']
};

const RISK_TERMS = ['死', '亡', '病', '哀', '悲', '恨', '怨', '孤', '苦', '凶', '杀', '鬼'];

function serialize(value) {
  return `${JSON.stringify(value, null, JSON_INDENT)}\n`;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

async function stageJson(relativePath, value, outputs) {
  const content = serialize(value);
  outputs.set(relativePath, content);
  return { path: relativePath.replaceAll('\\', '/'), sha256: sha256(content) };
}

export function assignRecommendationTier({ suitable, usageScore, rarity }) {
  if (!suitable) return undefined;
  if (usageScore >= 70 && rarity <= 0.25) return 'core';
  if (usageScore >= 50 && rarity <= 0.5) return 'extended';
  return 'distinctive';
}

export function createClassicTags(work) {
  const text = [work.title, work.chapter, ...(work.lines ?? [])].filter(Boolean).join('');
  const themes = Object.entries(THEME_RULES)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([theme]) => theme);
  if (themes.length === 0) {
    themes.push(SOURCE_FALLBACK_THEME[work.source] ?? '自然');
  }
  const styles = SOURCE_STYLES[work.source] ?? ['古典'];
  const positiveHits = Object.values(THEME_RULES).flat().filter((keyword) => text.includes(keyword)).length;
  const riskHits = RISK_TERMS.filter((keyword) => text.includes(keyword)).length;
  const suitability = Math.max(0, Math.min(100, 45 + themes.length * 5 + Math.min(25, positiveHits * 2) - riskHits * 8));

  return { themes, styles: [...styles], suitability };
}

export function createCharacterSources(characters, works) {
  const eligible = new Set(
    characters.filter((entry) => entry.naming?.suitable).map((entry) => entry.char),
  );
  const selected = new Map();

  for (const work of works) {
    const tags = work.tags ?? createClassicTags(work);
    for (const line of work.lines ?? []) {
      for (const char of new Set(Array.from(line))) {
        if (!eligible.has(char)) continue;
        const candidate = {
          char,
          workId: work.id,
          source: work.source,
          display: work.display,
          text: line,
          themes: tags.themes,
          level: 'D',
          use: 'character-only'
        };
        const current = selected.get(char);
        if (
          !current ||
          tags.suitability > current.suitability ||
          (tags.suitability === current.suitability && `${work.id}\u0000${line}` < current.order)
        ) {
          selected.set(char, {
            entry: candidate,
            suitability: tags.suitability,
            order: `${work.id}\u0000${line}`
          });
        }
      }
    }
  }

  return [...selected.values()]
    .map(({ entry }) => entry)
    .sort((left, right) => left.char.localeCompare(right.char, 'zh-Hans-CN'));
}

export function assertLicenseRegistry(registry) {
  if (!Array.isArray(registry.sources)) throw new Error('许可证登记表缺少 sources 数组');
  const unsafe = registry.sources.filter(
    (source) =>
      ['runtime', 'derived-runtime-evidence'].includes(source.usage) &&
      (!['allowed', 'allowed-with-share-alike'].includes(source.derivativePublication) ||
        ['noncommercial', 'unconfirmed'].includes(source.licenseClass)),
  );
  if (unsafe.length > 0) {
    throw new Error(`运行时来源未通过衍生发布门禁：${unsafe.map(({ id }) => id).join('、')}`);
  }
  const required = [
    'standard-chars-lqfeng',
    'standard-chars-jaywcjlove',
    'ai-chinese-naming',
    'chinese-names-corpus',
    'kangxi-mcp',
    'chinese-poetry',
    'chinese-classical-corpus-output',
    'kanripo-zhuangzi'
  ];
  const registered = new Set(registry.sources.map(({ id }) => id));
  const missing = required.filter((id) => !registered.has(id));
  if (missing.length > 0) throw new Error(`许可证登记表缺少来源：${missing.join('、')}`);
}

export function assertRejectedCharactersAbsent(runtimeCharacters, rejectedCharacters, label) {
  const overlaps = rejectedCharacters.filter((char) => runtimeCharacters.has(char));
  if (overlaps.length > 0) throw new Error(`${label} 硬拒绝被重新导入：${overlaps.join('、')}`);
}

function countDecisions(document) {
  const result = { total: document.entries?.length ?? 0, approved: 0, rejected: 0, pending: 0 };
  for (const entry of document.entries ?? []) {
    const decision = entry.decision ?? entry.review?.decision;
    if (decision in result) result[decision] += 1;
  }
  return result;
}

async function buildOutputs() {
  const outputs = new Map();
  const licenses = await readJson('docs/releases/phase6-source-license-registry.json');
  assertLicenseRegistry(licenses);

  const standard = await readJson('public/data/characters/standard.json');
  const characters = await readJson('public/data/characters/recommended-v2.json');
  const standardSet = new Set(standard.entries.map(({ char }) => char));
  const seen = new Set();
  const tierCounts = { core: 0, extended: 0, distinctive: 0 };
  const enrichedCharacters = characters.map((entry) => {
    if (seen.has(entry.char)) throw new Error(`推荐字库重复字符：${entry.char}`);
    seen.add(entry.char);
    if (entry.naming.suitable && !standardSet.has(entry.char)) {
      throw new Error(`推荐字不在通用规范汉字表：${entry.char}`);
    }
    if (entry.naming.suitable && entry.negative) throw new Error(`推荐字包含负面标记：${entry.char}`);
    const tier = assignRecommendationTier(entry.naming);
    let naming = { ...entry.naming };
    if (tier) {
      naming = {
        suitable: entry.naming.suitable,
        usageScore: entry.naming.usageScore,
        rarity: entry.naming.rarity,
        tier,
        gender: entry.naming.gender,
        styleTags: entry.naming.styleTags
      };
      tierCounts[tier] += 1;
    } else {
      delete naming.tier;
    }
    return { ...entry, naming };
  });

  const runtimeCharacters = new Set(
    enrichedCharacters.filter(({ naming }) => naming.suitable).map(({ char }) => char),
  );
  const firstReview = await readJson('docs/recommended-character-review-batch-01.json');
  const supplementReview = await readJson('docs/recommended-character-third-source-supplement-2026-09-13.json');
  const secondSourceAudit = await readJson('docs/recommended-character-second-source-audit-2026-09-12.json');
  const thirdSourceAudit = await readJson('docs/recommended-character-third-source-audit-2026-09-12.json');
  if (
    secondSourceAudit.policy?.hardRejectionsNeverOverridden !== true ||
    thirdSourceAudit.policy?.hardDecisionsNeverOverridden !== true ||
    supplementReview.policy?.hardDecisionsNeverOverridden !== true
  ) {
    throw new Error('历史扩容批次缺少 hard reject 不覆盖声明');
  }
  assertRejectedCharactersAbsent(
    runtimeCharacters,
    firstReview.entries.filter(({ review }) => review.decision === 'rejected').map(({ char }) => char),
    firstReview.batchId,
  );
  assertRejectedCharactersAbsent(
    runtimeCharacters,
    supplementReview.entries.filter(({ decision }) => decision === 'rejected').map(({ char }) => char),
    supplementReview.auditId,
  );

  const reviewPaths = [
    'docs/recommended-character-review-batch-01.json',
    'docs/recommended-character-review-batch-02-neutral.json',
    'docs/recommended-character-review-batch-03-second-source.json',
    'docs/recommended-character-third-source-audit-2026-09-12.json',
    'docs/recommended-character-third-source-supplement-2026-09-13.json'
  ];
  const reviewClosures = [];
  for (const reviewPath of reviewPaths) {
    const document = await readJson(reviewPath);
    const counts = countDecisions(document);
    if (counts.pending !== 0) throw new Error(`审校批次仍有 pending：${reviewPath}`);
    reviewClosures.push({ path: reviewPath, ...counts });
  }

  const index = await readJson('public/data/classics/index.json');
  const allWorks = [];
  const classicArtifacts = [];
  for (const packageItem of index.packages) {
    const relativePath = `public/data/classics/${packageItem.path}`;
    const works = await readJson(relativePath);
    const enriched = works.map((work) => ({ ...work, tags: createClassicTags(work) }));
    allWorks.push(...enriched);
    classicArtifacts.push(await stageJson(relativePath, enriched, outputs));
  }

  const basicPath = 'public/data/classics/basic.json';
  const basicWorks = await readJson(basicPath);
  const basicArtifact = await stageJson(
    basicPath,
    basicWorks.map((work) => ({ ...work, tags: createClassicTags(work) })),
    outputs,
  );

  const characterSources = createCharacterSources(enrichedCharacters, allWorks);
  const characterSourceRegistry = {
    schemaVersion: 1,
    policy: 'D 级仅证明单字在典籍原文中出现，不得作为双字整名出处展示。',
    level: 'D',
    use: 'character-only',
    entries: characterSources
  };
  const sourceArtifact = await stageJson(
    'public/data/classics/character-sources.json',
    characterSourceRegistry,
    outputs,
  );
  const enrichedIndex = {
    ...index,
    schemaVersion: 3,
    tagSchemaVersion: 1,
    characterSourceRegistry: {
      path: 'character-sources.json',
      entryCount: characterSources.length,
      level: 'D',
      use: 'character-only'
    }
  };
  const indexArtifact = await stageJson('public/data/classics/index.json', enrichedIndex, outputs);
  const characterArtifact = await stageJson(
    'public/data/characters/recommended-v2.json',
    enrichedCharacters,
    outputs,
  );

  const manifest = {
    schemaVersion: 1,
    phase: 'Phase 6',
    admission: {
      newExternalSources: 0,
      newCandidates: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      note: '本轮没有引入新来源或候选；目标规模是方向性目标，不以配额降低门槛。'
    },
    licenseRegistry: {
      path: 'docs/releases/phase6-source-license-registry.json',
      sha256: sha256(serialize(licenses)),
      runtimeSourceCount: licenses.sources.filter(({ usage }) => ['runtime', 'derived-runtime-evidence'].includes(usage)).length,
      excludedSourceCount: licenses.sources.filter(({ usage }) => usage === 'excluded').length
    },
    reviewClosures,
    characters: {
      artifact: characterArtifact,
      totalRecords: enrichedCharacters.length,
      suitable: runtimeCharacters.size,
      unsuitable: enrichedCharacters.length - runtimeCharacters.size,
      recommendationTiers: tierCounts,
      duplicateCharacters: 0,
      protectedRejectOverlaps: 0
    },
    classics: {
      works: allWorks.length,
      taggedWorks: allWorks.filter(({ tags }) => tags).length,
      packageArtifacts: classicArtifacts,
      legacyBasicArtifact: basicArtifact,
      indexArtifact,
      characterSourceArtifact: sourceArtifact,
      characterSourceEntries: characterSources.length,
      uncoveredSuitableCharacters: runtimeCharacters.size - characterSources.length,
      abcReferenceLevelsUnchanged: true,
      dLevelWholeNameClaimAllowed: false
    }
  };
  await stageJson('docs/releases/phase6-data-manifest.json', manifest, outputs);
  return { outputs, manifest };
}

async function main() {
  const { outputs, manifest } = await buildOutputs();
  for (const [relativePath, content] of outputs) {
    const absolutePath = path.join(ROOT, relativePath);
    if (CHECK_MODE) {
      const current = await readFile(absolutePath, 'utf8').catch(() => '');
      if (current !== content) throw new Error(`Phase 6 产物漂移：${relativePath}`);
    } else {
      await writeFile(absolutePath, content, 'utf8');
    }
  }
  console.log(
    `Phase 6 ${CHECK_MODE ? 'check' : 'build'} passed: ${manifest.characters.suitable} chars, ${manifest.classics.works} works, ${manifest.classics.characterSourceEntries} D-level sources.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
