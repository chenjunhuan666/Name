import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateReviewBatch } from './import-approved-character-reviews.mjs';

export const SOURCE = Object.freeze({
  project: 'wainshine/Chinese-Names-Corpus',
  repository: 'https://github.com/wainshine/Chinese-Names-Corpus',
  commit: '47d4af8d816f6212787ddfc49173cac3b994b58d',
  license: 'Apache-2.0',
  corpusSha256: '30d83f3e682d355ac1d3f18482c14ff5e2bdd0ebe704bff1ef196eabdf93939b',
  surnameWorkbookSha256: 'c0ec61ece459e1527f692bff9d1bb8d184f49d48966659b1eb3822769e8f28b6',
  licenseSha256: 'e03ba41d7fab20700769fe4118bab50d800cb74f990353a05d2f5fff1c228363',
});

const REVIEWED_AT = '2026-09-11T18:10:56.870Z';
const REVIEWER = '项目第二来源规则审校（用户明确授权 V2.3）';
const EXPECTED_NAMES = 1_144_226;
const EXPECTED_UNIQUE_GIVEN_CHARACTERS = 2_238;
const CORPUS_EVIDENCE_POINTS = 20;
const MIN_OCCURRENCES = 5;
const APPROVE_THRESHOLD = 70;
const RUNTIME_SOURCE_MARKER = `Chinese-Names-Corpus:${SOURCE.commit}:gender-120W`;

// Extracted from the fixed Chinese_Family_Name（1k）.xlsx snapshot. Every
// remaining surname is one character, so only compound surnames are required
// to split the corpus deterministically.
export const COMPOUND_SURNAMES = new Set(
  '欧阳 百里 淳于 澹台 第五 东方 独孤 端木 段干 公孙 公西 公羊 公冶 赫连 呼延 皇甫 乐正 冷狐 令狐 刘付 刘傅 闾丘 慕容 纳兰 南宫 南门 殴阳 濮阳 亓官 上官 申屠 司空 司寇 司马 司徒 太史 太叔 拓跋 完颜 万俟 尉迟 闻人 巫马 西门 夏侯 夏候 鲜于 轩辕 宇文 长孙 钟离 仲孙 诸葛 颛孙 宗政 左丘'.split(
    ' ',
  ),
);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function parseNameCorpus(text) {
  const frequencies = new Map();
  const genderCounts = new Map();
  let names = 0;
  let oneCharacterGivenNames = 0;
  let twoCharacterGivenNames = 0;

  for (const rawLine of text.replace(/^\uFEFF/u, '').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (
      !line ||
      line === 'dict,sex' ||
      line.startsWith('By@') ||
      /^\d{4}\.\d{2}\.\d{2}$/u.test(line)
    ) {
      continue;
    }
    const separator = line.lastIndexOf(',');
    if (separator < 1) throw new Error(`姓名语料行格式错误：${line}`);
    const fullName = line.slice(0, separator).trim();
    const gender = line.slice(separator + 1).trim();
    const surnameLength = COMPOUND_SURNAMES.has(fullName.slice(0, 2)) ? 2 : 1;
    const givenName = fullName.slice(surnameLength);
    if (!/^[\u3400-\u9fff]{1,2}$/u.test(givenName)) {
      throw new Error(`姓名语料无法按固定姓氏口径拆分：${fullName}`);
    }
    if (!['男', '女', '未知'].includes(gender)) {
      throw new Error(`姓名语料包含未知性别标签：${gender}`);
    }
    names += 1;
    if ([...givenName].length === 1) oneCharacterGivenNames += 1;
    else twoCharacterGivenNames += 1;
    for (const char of givenName) {
      frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
      const counts = genderCounts.get(char) ?? { male: 0, female: 0, unknown: 0 };
      if (gender === '男') counts.male += 1;
      else if (gender === '女') counts.female += 1;
      else counts.unknown += 1;
      genderCounts.set(char, counts);
    }
  }

  return {
    frequencies,
    genderCounts,
    counts: {
      names,
      oneCharacterGivenNames,
      twoCharacterGivenNames,
      uniqueGivenCharacters: frequencies.size,
    },
  };
}

export function selectSecondSourceApprovals({ batch, audit, corpus }) {
  const auditByCharacter = new Map(audit.entries.map((entry) => [entry.char, entry]));
  const approvals = [];
  const retained = { explicitOrHardReject: 0, insufficientEvidence: 0 };

  for (const entry of batch.entries) {
    if (entry.review.decision !== 'rejected') continue;
    const previous = auditByCharacter.get(entry.char);
    if (
      !previous ||
      previous.ruleIds.length !== 1 ||
      previous.ruleIds[0] !== 'neutral.score.below-approve-threshold'
    ) {
      retained.explicitOrHardReject += 1;
      continue;
    }
    const occurrences = corpus.frequencies.get(entry.char) ?? 0;
    const score = previous.score + CORPUS_EVIDENCE_POINTS;
    if (occurrences < MIN_OCCURRENCES || score < APPROVE_THRESHOLD) {
      retained.insufficientEvidence += 1;
      continue;
    }
    approvals.push({ entry, previous, occurrences, score });
  }

  return { approvals, retained };
}

function createBatch({ sourceBatch, queueText, selected }) {
  return {
    schemaVersion: 1,
    batchId: 'neutral-second-source-03',
    sourceQueue: sourceBatch.sourceQueue,
    policy: {
      scope:
        'previously rejected neutral candidates whose sole blocker was insufficient evidence; hard and explicit rejections are excluded',
      entryEligibility: sourceBatch.policy.entryEligibility,
      allowedDecisions: ['approved'],
      decisionRule: {
        priorRuleIdsExactly: ['neutral.score.below-approve-threshold'],
        corpusMinimumOccurrences: MIN_OCCURRENCES,
        corpusEvidencePoints: CORPUS_EVIDENCE_POINTS,
        approveThreshold: APPROVE_THRESHOLD,
      },
      runtimeSourceMarkers: [RUNTIME_SOURCE_MARKER],
      sourceBoundary:
        'corpus occurrence is evidence of observed name use, not proof that every concrete full name is suitable',
      sourceQueueVerifiedSha256: sha256(queueText),
    },
    sources: {
      ...SOURCE,
      corpusPath: 'Chinese_Names_Corpus/Chinese_Names_Corpus_Gender（120W）.txt',
      surnameWorkbookPath: 'Chinese_Names_Corpus/Chinese_Family_Name（1k）.xlsx',
      compoundSurnameCount: COMPOUND_SURNAMES.size,
    },
    counts: {
      total: selected.approvals.length,
      pending: 0,
      approved: selected.approvals.length,
      rejected: 0,
    },
    entries: selected.approvals.map(({ entry, previous, occurrences, score }) => ({
      char: entry.char,
      evidence: entry.evidence,
      review: {
        decision: 'approved',
        note: `第二来源规则审校：固定姓名语料中作为名字用字出现 ${occurrences} 次；原审计仅因证据分不足（${previous.score}），补充独立语料证据后为 ${score}，且未命中既有硬拒绝规则。`,
        approvedMeaning: entry.evidence.source.meaning,
        reviewedBy: REVIEWER,
        reviewedAt: REVIEWED_AT,
      },
    })),
  };
}

function createAudit({ corpus, selected }) {
  return {
    schemaVersion: 1,
    auditId: 'recommended-character-second-source-2026-09-12',
    source: SOURCE,
    parsing: {
      rule: 'compound surname first; otherwise remove one leading surname character; accept one or two CJK given-name characters',
      compoundSurnameCount: COMPOUND_SURNAMES.size,
      ...corpus.counts,
    },
    policy: {
      previousRuleIdsExactly: ['neutral.score.below-approve-threshold'],
      minimumOccurrences: MIN_OCCURRENCES,
      evidencePoints: CORPUS_EVIDENCE_POINTS,
      approveThreshold: APPROVE_THRESHOLD,
      hardRejectionsNeverOverridden: true,
    },
    counts: {
      approved: selected.approvals.length,
      retainedExplicitOrHardReject: selected.retained.explicitOrHardReject,
      retainedInsufficientEvidence: selected.retained.insufficientEvidence,
    },
    entries: selected.approvals.map(({ entry, previous, occurrences, score }) => ({
      char: entry.char,
      occurrences,
      previousScore: previous.score,
      score,
      ruleIds: ['second-source.corpus-observed', 'second-source.score.approve'],
      genderCounts: corpus.genderCounts.get(entry.char),
    })),
  };
}

function createMarkdown(audit) {
  const lines = [
    '# 推荐字第二来源批量审计',
    '',
    `- 固定来源：\`${audit.source.project}@${audit.source.commit}\`（${audit.source.license}）`,
    `- 语料解析：${audit.parsing.names.toLocaleString('en-US')} 个全名；单字名 ${audit.parsing.oneCharacterGivenNames.toLocaleString('en-US')}、双字名 ${audit.parsing.twoCharacterGivenNames.toLocaleString('en-US')}；名字用字 ${audit.parsing.uniqueGivenCharacters.toLocaleString('en-US')} 种`,
    `- 准入规则：原决定只能是“仅证据分不足”，语料出现至少 ${audit.policy.minimumOccurrences} 次，补 ${audit.policy.evidencePoints} 分后总分至少 ${audit.policy.approveThreshold}；硬拒绝不覆盖`,
    `- 结果：批准 ${audit.counts.approved}；保留硬拒绝/明确拒绝 ${audit.counts.retainedExplicitOrHardReject}；证据仍不足 ${audit.counts.retainedInsufficientEvidence}`,
    '',
    '| 字 | 语料次数 | 原分 | 新分 | 男 | 女 | 未知 |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const entry of audit.entries) {
    lines.push(
      `| ${entry.char} | ${entry.occurrences} | ${entry.previousScore} | ${entry.score} | ${entry.genderCounts.male} | ${entry.genderCounts.female} | ${entry.genderCounts.unknown} |`,
    );
  }
  lines.push(
    '',
    '> 边界：语料出现只证明在该固定数据集中观察到姓名使用，不表示每个具体全名都自然，也不推翻语义、读音、同音风险或用户明确拒绝。',
    '',
  );
  return lines.join('\n');
}

export async function main(args = process.argv.slice(2)) {
  const [corpusPath, surnameWorkbookPath, licensePath] = args;
  if (!corpusPath || !surnameWorkbookPath || !licensePath) {
    throw new Error('请提供姓名性别语料、姓氏工作簿和 LICENSE 的固定快照路径');
  }
  const paths = {
    sourceBatch: 'docs/recommended-character-review-batch-02-neutral.json',
    previousAudit: 'docs/recommended-character-neutral-balanced-audit-2026-09-10.json',
    queue: 'docs/recommended-character-review.json',
    batch: 'docs/recommended-character-review-batch-03-second-source.json',
    auditJson: 'docs/recommended-character-second-source-audit-2026-09-12.json',
    auditMarkdown: 'docs/recommended-character-second-source-audit-2026-09-12.md',
  };
  const [corpusBuffer, surnameWorkbookBuffer, licenseBuffer, sourceBatchText, previousAuditText, queueText] =
    await Promise.all([
      readFile(corpusPath),
      readFile(surnameWorkbookPath),
      readFile(licensePath),
      readFile(paths.sourceBatch, 'utf8'),
      readFile(paths.previousAudit, 'utf8'),
      readFile(paths.queue, 'utf8'),
    ]);
  if (sha256(corpusBuffer) !== SOURCE.corpusSha256) throw new Error('姓名语料 SHA-256 与固定快照不一致');
  if (sha256(surnameWorkbookBuffer) !== SOURCE.surnameWorkbookSha256) throw new Error('姓氏工作簿 SHA-256 与固定快照不一致');
  if (sha256(licenseBuffer) !== SOURCE.licenseSha256) throw new Error('来源 LICENSE SHA-256 与固定快照不一致');

  const corpus = parseNameCorpus(corpusBuffer.toString('utf8'));
  if (
    corpus.counts.names !== EXPECTED_NAMES ||
    corpus.counts.uniqueGivenCharacters !== EXPECTED_UNIQUE_GIVEN_CHARACTERS
  ) {
    throw new Error(`姓名语料解析计数不一致：${JSON.stringify(corpus.counts)}`);
  }
  const sourceBatch = JSON.parse(sourceBatchText);
  const selected = selectSecondSourceApprovals({
    batch: sourceBatch,
    audit: JSON.parse(previousAuditText),
    corpus,
  });
  if (selected.approvals.length !== 204) {
    throw new Error(`第二来源批准数与固定基线不一致：${selected.approvals.length}`);
  }
  const batch = createBatch({ sourceBatch, queueText, selected });
  validateReviewBatch(batch, queueText);
  const audit = createAudit({ corpus, selected });
  await Promise.all([
    writeFile(paths.batch, `${JSON.stringify(batch, null, 2)}\n`, 'utf8'),
    writeFile(paths.auditJson, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
    writeFile(paths.auditMarkdown, createMarkdown(audit), 'utf8'),
  ]);
  console.log(JSON.stringify({ corpus: corpus.counts, ...audit.counts }));
  return { batch, audit };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
