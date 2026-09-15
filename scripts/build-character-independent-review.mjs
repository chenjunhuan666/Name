import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const unicodeVersion = '17.0.0';
const chineseNamesCommit = 'dd948e738da42d22f5158877d359df359b190589';

const assessments = new Map(
  [
    ['充', 'corroborated', 'supported', '“充实、充满”的核心义项得到独立字义支持，且历史姓名字符语料有收录。'],
    ['攀', 'partial', 'ambiguous', '独立字义支持“攀登”，但不直接支持“高升”这一正向引申；历史姓名字符语料有收录。'],
    ['涧', 'corroborated', 'supported', '独立字义支持山间溪流这一自然意象，且历史姓名字符语料有收录。'],
    ['夙', 'corroborated', 'insufficient', '独立字义支持“清早、从前”，但历史姓名字符语料未收录，姓名使用证据不足。'],
    ['讴', 'partial', 'ambiguous', '独立字义支持“歌唱、歌曲”，但不直接确认“赞美”这一语境；历史姓名字符语料有收录。'],
    ['诤', 'corroborated', 'supported', '独立字义支持直言规劝，且历史姓名字符语料有收录。'],
    ['柢', 'corroborated', 'insufficient', '独立字义支持“根、基础”，但历史姓名字符语料未收录，姓名使用证据不足。'],
    ['颀', 'corroborated', 'supported', '独立字义支持身材修长，且历史姓名字符语料有收录。'],
    ['皑', 'corroborated', 'supported', '独立字义支持洁白明亮，且历史姓名字符语料有收录。'],
    ['嵋', 'partial', 'ambiguous', '独立字义仅确认峨眉山地名，不直接支持“秀美”的审美引申；历史姓名字符语料有收录。'],
    ['弼', 'corroborated', 'supported', '独立字义支持辅佐、帮助，且历史姓名字符语料有收录。'],
    ['鹭', 'partial', 'ambiguous', '独立字义确认白鹭类鸟名，不直接支持“高洁”的象征义；历史姓名字符语料有收录。'],
    ['鎏', 'partial', 'ambiguous', '独立字义支持“纯金”，但不完整支持“纯美、镀金”的全部释义；历史姓名字符语料有收录。'],
    ['铖', 'corroborated', 'supported', '独立字义直接标注为人名用字，历史姓名字符语料也有收录；“兵器”义仍需另证。'],
    ['恳', 'corroborated', 'supported', '独立字义支持诚恳、恳切，且历史姓名字符语料有收录。'],
    ['禀', 'unsupported', 'insufficient', '独立字义只给出禀报、请求，未支持“承受、禀赋”；历史姓名字符语料也未收录。'],
    ['玎', 'partial', 'ambiguous', '独立字义支持清脆声响，但不直接限定为玉石声；历史姓名字符语料有收录。'],
    ['谌', 'corroborated', 'supported', '独立字义支持真诚、可信，并含姓氏义；历史姓名字符语料有收录。'],
    ['濂', 'partial', 'ambiguous', '独立字义只确认瀑布、河流地名，不直接支持“清廉、濂溪”的文化联想；历史姓名字符语料有收录。'],
  ].map(([char, meaningAlignment, status, summary]) => [
    char,
    { meaningAlignment, status, summary },
  ]),
);

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function parseUnihanReadings(text) {
  const version = text.match(/^# Unicode Version ([^\r\n]+)$/mu)?.[1];
  if (version !== unicodeVersion) {
    throw new Error(
      `Unihan 版本错误：要求 ${unicodeVersion}，实际 ${version ?? '未知'}`,
    );
  }

  const records = new Map();
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(
      /^(U\+[0-9A-F]+)\t(kDefinition|kMandarin)\t(.+)$/u,
    );
    if (!match) continue;

    const [, codePoint, property, value] = match;
    const char = String.fromCodePoint(Number.parseInt(codePoint.slice(2), 16));
    const record = records.get(char) ?? { codePoint };
    record[property] = value;
    records.set(char, record);
  }
  return records;
}

function parseChineseNamesCoverage(text) {
  const lines = text.trim().split(/\r?\n/u);
  if (lines[0]?.split(',')[0] !== 'character') {
    throw new Error('ChineseNames CSV 格式错误：首列不是 character');
  }
  return new Set(
    lines
      .slice(1)
      .map((line) => line.slice(0, line.indexOf(',')))
      .filter(Boolean),
  );
}

function countBy(entries, selector) {
  return entries.reduce((counts, entry) => {
    const key = selector(entry);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildIndependentReviewEvidence({
  guidanceText,
  unihanText,
  chineseNamesCsvText,
}) {
  const guidance = JSON.parse(guidanceText);
  const candidates = guidance.entries.filter(
    ({ guidance: item }) =>
      item.suggestion === 'retain-for-independent-check',
  );
  const expectedCharacters = [...assessments.keys()];
  const actualCharacters = candidates.map(({ char }) => char);
  if (
    expectedCharacters.length !== actualCharacters.length ||
    expectedCharacters.some((char) => !actualCharacters.includes(char))
  ) {
    throw new Error('独立核验清单与 19 字初步建议范围不一致');
  }
  if (
    candidates.some(
      ({ guidance: item }) => item.finalDecisionWritten !== false,
    )
  ) {
    throw new Error('独立核验只能读取尚未写入最终决定的建议记录');
  }

  const unihan = parseUnihanReadings(unihanText);
  const chineseNamesCoverage = parseChineseNamesCoverage(chineseNamesCsvText);
  const entries = candidates.map(({ char, evidence }) => {
    const lexical = unihan.get(char);
    if (!lexical?.kDefinition || !lexical?.kMandarin) {
      throw new Error(`Unihan 缺少字符“${char}”的字义或普通话读音`);
    }
    if (lexical.kMandarin !== evidence.facts.pinyin) {
      throw new Error(
        `字符“${char}”的普通话读音不一致：来源=${evidence.facts.pinyin}，Unihan=${lexical.kMandarin}`,
      );
    }

    const assessment = assessments.get(char);
    const isCovered = chineseNamesCoverage.has(char);
    if (assessment.status === 'supported' && !isCovered) {
      throw new Error(`字符“${char}”缺少姓名语料覆盖，不能标记 supported`);
    }

    return {
      char,
      sourceEvidence: {
        meaning: evidence.source.meaning,
        pinyin: evidence.facts.pinyin,
      },
      independentEvidence: {
        unihan: {
          codePoint: lexical.codePoint,
          definition: lexical.kDefinition,
          mandarin: lexical.kMandarin,
          pinyinMatches: true,
          meaningAlignment: assessment.meaningAlignment,
        },
        chineseNames: {
          coverage: isCovered ? 'present' : 'absent',
          interpretation: isCovered
            ? '该字符出现在 1930—2008 历史姓名字符统计中；只证明曾被用于姓名，不证明当前适名性。'
            : '该字符未出现在此数据集中；来源说明极罕见字符未收录，因此不能推断为从未用于姓名。',
        },
      },
      assessment: {
        evidenceStatus: assessment.status,
        summary: assessment.summary,
        finalDecisionWritten: false,
      },
    };
  });

  const evidenceStatus = countBy(
    entries,
    ({ assessment }) => assessment.evidenceStatus,
  );
  const nameCorpusCoverage = countBy(
    entries,
    ({ independentEvidence }) => independentEvidence.chineseNames.coverage,
  );
  const meaningAlignment = countBy(
    entries,
    ({ independentEvidence }) =>
      independentEvidence.unihan.meaningAlignment,
  );
  const counts = {
    total: entries.length,
    evidenceStatus: {
      supported: evidenceStatus.supported ?? 0,
      ambiguous: evidenceStatus.ambiguous ?? 0,
      insufficient: evidenceStatus.insufficient ?? 0,
    },
    nameCorpusCoverage: {
      present: nameCorpusCoverage.present ?? 0,
      absent: nameCorpusCoverage.absent ?? 0,
    },
    meaningAlignment: {
      corroborated: meaningAlignment.corroborated ?? 0,
      partial: meaningAlignment.partial ?? 0,
      unsupported: meaningAlignment.unsupported ?? 0,
    },
    pinyinMatches: entries.filter(
      ({ independentEvidence }) =>
        independentEvidence.unihan.pinyinMatches,
    ).length,
    finalDecisionsWritten: 0,
  };
  if (
    counts.total !== 19 ||
    counts.evidenceStatus.supported !== 9 ||
    counts.evidenceStatus.ambiguous !== 7 ||
    counts.evidenceStatus.insufficient !== 3 ||
    counts.nameCorpusCoverage.present !== 16 ||
    counts.nameCorpusCoverage.absent !== 3 ||
    counts.meaningAlignment.corroborated !== 11 ||
    counts.meaningAlignment.partial !== 7 ||
    counts.meaningAlignment.unsupported !== 1 ||
    counts.pinyinMatches !== 19
  ) {
    throw new Error(`独立核验计数异常：${JSON.stringify(counts)}`);
  }

  return {
    schemaVersion: 1,
    batchId: guidance.batchId,
    sourceGuidance: {
      path: 'docs/recommended-character-review-guidance-batch-01.json',
      sha256: sha256(guidanceText),
    },
    sources: {
      lexical: {
        name: 'Unicode Unihan Database',
        version: unicodeVersion,
        releaseUrl:
          'https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip',
        file: 'Unihan_Readings.txt',
        sha256: sha256(unihanText),
        fields: ['kDefinition', 'kMandarin'],
        evidenceBoundary:
          'information for lexical meaning and customary Mandarin reading; not a personal-name suitability standard',
      },
      nameUsage: {
        name: 'psychbruce/ChineseNames',
        commit: chineseNamesCommit,
        file: 'data-csv/givenname.csv',
        sha256: sha256(chineseNamesCsvText),
        sourceUrl: `https://raw.githubusercontent.com/psychbruce/ChineseNames/${chineseNamesCommit}/data-csv/givenname.csv`,
        coverage: 'Han Chinese given-name characters, birth cohorts 1930-2008, living in 2008',
        license: 'GPL-3 and CC BY-NC-SA; non-commercial use only',
        evidenceBoundary:
          'research-only present/absent coverage check; raw frequencies and ratings are not copied, and this source is excluded from runtime and release data',
      },
    },
    policy: {
      nonBinding:
        'supported means only that the fixed source core meaning, pronunciation and historical name-corpus coverage have independent support; it is not approval',
      requiredBeforeDecision:
        'a human reviewer must still check complete dictionary senses, homophones, two-character combinations and contemporary naming suitability before writing approved or rejected',
      runtimeEffect: 'none',
      finalDecisionWritten: false,
    },
    counts,
    entries,
  };
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function toMarkdown(result) {
  const lines = [
    '# 推荐字首批独立证据核验',
    '',
    '> 本文仅核验 19 个“建议保留进入独立复核”字符的字义、普通话读音与历史姓名语料覆盖；“支持”不是批准，所有最终决定仍为空，运行时推荐字库不受影响。',
    '',
    `- 批次：\`${result.batchId}\``,
    `- 证据状态：支持 ${result.counts.evidenceStatus.supported}、存在歧义 ${result.counts.evidenceStatus.ambiguous}、证据不足 ${result.counts.evidenceStatus.insufficient}`,
    `- Unihan 读音一致：${result.counts.pinyinMatches}/${result.counts.total}`,
    `- 历史姓名语料覆盖：有 ${result.counts.nameCorpusCoverage.present}、无 ${result.counts.nameCorpusCoverage.absent}`,
    `- 已写入最终决定：${result.counts.finalDecisionsWritten}`,
    `- 运行时影响：\`${result.policy.runtimeEffect}\``,
    '',
    '## 证据边界',
    '',
    '- Unicode Unihan 17.0.0 的 `kDefinition` 与 `kMandarin` 只作为独立字义和常用普通话读音证据，不是人名适用性标准。',
    '- ChineseNames 只做 1930—2008 历史姓名字符的 present/absent 覆盖核验；其数据限非商业使用，原始频次和评分未复制，也不进入运行时或发布数据。',
    '- “未覆盖”不能解释为“从未用于姓名”，因为来源明确说明极罕见字符未收录。',
    '',
    '| 字 | 现有释义 | Unihan 字义 | 读音 | 字义对齐 | 姓名语料 | 证据状态 | 核验结论 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const entry of result.entries) {
    lines.push(
      `| ${entry.char} | ${escapeMarkdown(entry.sourceEvidence.meaning)} | ${escapeMarkdown(entry.independentEvidence.unihan.definition)} | ${entry.independentEvidence.unihan.mandarin} | ${entry.independentEvidence.unihan.meaningAlignment} | ${entry.independentEvidence.chineseNames.coverage} | ${entry.assessment.evidenceStatus} | ${escapeMarkdown(entry.assessment.summary)} |`,
    );
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export async function main(args = process.argv.slice(2)) {
  const unihanPath = args[0];
  const chineseNamesPath = args[1];
  const guidancePath =
    args[2] ?? 'docs/recommended-character-review-guidance-batch-01.json';
  const jsonOutputPath =
    args[3] ?? 'docs/recommended-character-independent-review-batch-01.json';
  const markdownOutputPath =
    args[4] ?? 'docs/recommended-character-independent-review-batch-01.md';
  if (!unihanPath || !chineseNamesPath) {
    throw new Error(
      '请依次提供 Unicode 17.0.0 Unihan_Readings.txt 与固定提交的 ChineseNames givenname.csv',
    );
  }

  const [guidanceText, unihanText, chineseNamesCsvText] = await Promise.all([
    readFile(guidancePath, 'utf8'),
    readFile(unihanPath, 'utf8'),
    readFile(chineseNamesPath, 'utf8'),
  ]);
  const result = buildIndependentReviewEvidence({
    guidanceText,
    unihanText,
    chineseNamesCsvText,
  });
  await Promise.all([
    writeFile(jsonOutputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8'),
    writeFile(markdownOutputPath, toMarkdown(result), 'utf8'),
  ]);
  console.log(
    `已核验 ${result.counts.total} 字：支持 ${result.counts.evidenceStatus.supported}、存在歧义 ${result.counts.evidenceStatus.ambiguous}、证据不足 ${result.counts.evidenceStatus.insufficient}；最终决定 0，运行时影响 none。`,
  );
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
