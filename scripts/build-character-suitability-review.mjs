import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const cedictRelease = '2026-09-03 08:26:05 GMT';
const cedictTextSha256 =
  'c211a1138cdc1194b492532c4ac3eb3a7bb786cbba2165ba885f91d34f266c88';

const reviewConfig = [
  {
    char: '充',
    exactHomophones: ['忡', '憃', '冲'],
    riskLevel: 'medium',
    recommendation: 'needs-human-judgment',
    rationale:
      '正向核心义明确，但完整义项包含“冒充、假扮”，单字也偏常用动词；建议只在双字语义自然且姓氏连读安全时考虑。',
    samplePairs: ['充和', '宇充'],
  },
  {
    char: '涧',
    exactHomophones: ['贱'],
    riskLevel: 'high',
    recommendation: 'reject-candidate',
    rationale:
      '山涧意象清晰，但与常用贬义字“贱”完全同音，默认推荐会产生明显口语误听风险。',
    samplePairs: ['涧宁', '泽涧'],
  },
  {
    char: '诤',
    exactHomophones: ['症', '挣'],
    riskLevel: 'medium',
    recommendation: 'needs-human-judgment',
    rationale:
      '直言规劝具有品格含义，但字义偏行为，且词典记录台湾读音 zhēng；需要结合姓氏、地区读音和双字语义判断。',
    samplePairs: ['诤远', '弘诤'],
  },
  {
    char: '颀',
    exactHomophones: ['娸', '疧'],
    riskLevel: 'low',
    recommendation: 'approve-candidate',
    rationale:
      '字义正向、读音稳定，显著负面同音字较生僻；可进入人工批准候选，但仍需核对具体姓氏连读。',
    samplePairs: ['颀然', '宇颀'],
  },
  {
    char: '皑',
    exactHomophones: ['癌', '騃', '挨'],
    riskLevel: 'high',
    recommendation: 'reject-candidate',
    rationale:
      '洁白意象正向，但与高显著度疾病词“癌”完全同音，作为默认推荐字风险过高。',
    samplePairs: ['皑宁', '皑然'],
  },
  {
    char: '弼',
    exactHomophones: ['弊', '毙', '敝', '愎', '婢', '痹'],
    riskLevel: 'medium',
    recommendation: 'needs-human-judgment',
    rationale:
      '“辅佐”义明确且有传统人名语感，但同音负面字较多；双字组合能否稳定消歧必须结合姓氏判断。',
    samplePairs: ['弘弼', '弼文'],
  },
  {
    char: '铖',
    exactHomophones: ['惩', '裎', '酲'],
    riskLevel: 'medium',
    recommendation: 'approve-candidate',
    rationale:
      '词典直接标注用于人名，且常见同音联想“成、诚”较正向；可进入人工批准候选，但字义解释不得扩写为未经证实的兵器义。',
    samplePairs: ['铖宇', '泽铖'],
  },
  {
    char: '恳',
    exactHomophones: ['啃'],
    riskLevel: 'high',
    recommendation: 'reject-candidate',
    rationale:
      '诚恳义正向，但字形和词法高度依赖“恳求、诚恳”等常用词，与口语动词“啃”完全同音，双字姓名自然度不足。',
    samplePairs: ['恳诚', '诚恳'],
  },
  {
    char: '谌',
    exactHomophones: ['沉', '尘', '陈'],
    riskLevel: 'medium',
    recommendation: 'needs-human-judgment',
    rationale:
      '真诚信义得到支持，但同时是姓氏用字，且“沉、尘”等同音联想较强；作为名字时需结合姓氏避免身份和语义混淆。',
    samplePairs: ['谌睿', '礼谌'],
  },
];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function normalizePinyin(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-züv]/giu, '')
    .replaceAll('ü', 'v')
    .toLowerCase();
}

function approximatePinyin(value) {
  return value
    .replaceAll('zh', 'z')
    .replaceAll('ch', 'c')
    .replaceAll('sh', 's')
    .replaceAll('eng', 'en')
    .replaceAll('ing', 'in');
}

function parseGivenNameHomophones(text) {
  return [...text.matchAll(/\{[\s\S]*?\}/gu)].flatMap(([block]) => {
    const label = block.match(/label:\s*'([^']+)'/u)?.[1];
    const pinyin = block.match(/pinyin:\s*'([^']+)'/u)?.[1];
    const scope = block.match(/scope:\s*'([^']+)'/u)?.[1];
    if (!label || !pinyin || scope !== 'given') return [];
    return [
      {
        label,
        pinyin,
        approximate: /approximate:\s*true/u.test(block),
      },
    ];
  });
}

export function parseCedict(text) {
  if (!text.includes('Creative Commons Attribution-ShareAlike 4.0')) {
    throw new Error('CC-CEDICT 输入缺少 CC BY-SA 4.0 许可标记');
  }
  if (sha256(text) !== cedictTextSha256) {
    throw new Error('CC-CEDICT 文本 SHA-256 与固定快照不一致');
  }

  const entries = new Map();
  for (const line of text.split(/\r?\n/u)) {
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/$/u);
    if (!match) continue;
    const [, traditional, simplified, pinyin, definitionsText] = match;
    const entry = {
      traditional,
      simplified,
      pinyin,
      definitions: definitionsText.split('/'),
    };
    for (const char of new Set([traditional, simplified])) {
      const charEntries = entries.get(char) ?? [];
      charEntries.push(entry);
      entries.set(char, charEntries);
    }
  }
  return entries;
}

function assessCurrentHomophoneRules(pinyin, rules) {
  const normalized = pinyin.map(normalizePinyin).join('');
  return rules.flatMap((rule) => {
    const exact = normalized === rule.pinyin;
    const approximate =
      !exact &&
      rule.approximate &&
      approximatePinyin(normalized) === approximatePinyin(rule.pinyin);
    return exact || approximate
      ? [{ label: rule.label, matchType: exact ? 'exact' : 'approximate' }]
      : [];
  });
}

function countBy(entries, selector) {
  return entries.reduce((counts, entry) => {
    const key = selector(entry);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildSuitabilityReview({
  independentReviewText,
  guidanceText,
  recommendedText,
  badHomophonesText,
  cedictText,
}) {
  const independentReview = JSON.parse(independentReviewText);
  const guidance = JSON.parse(guidanceText);
  const recommended = JSON.parse(recommendedText).filter(
    ({ naming }) => naming.suitable,
  );
  const supported = independentReview.entries.filter(
    ({ assessment }) => assessment.evidenceStatus === 'supported',
  );
  const expectedCharacters = reviewConfig.map(({ char }) => char);
  const actualCharacters = supported.map(({ char }) => char);
  if (
    expectedCharacters.length !== actualCharacters.length ||
    expectedCharacters.some((char) => !actualCharacters.includes(char))
  ) {
    throw new Error('适名性复核范围与 9 个独立证据支持字不一致');
  }
  if (
    independentReview.policy?.finalDecisionWritten !== false ||
    independentReview.policy?.runtimeEffect !== 'none'
  ) {
    throw new Error('适名性复核只能读取未产生运行时决定的独立证据');
  }

  const cedict = parseCedict(cedictText);
  const homophoneRules = parseGivenNameHomophones(badHomophonesText);
  const recommendedByCharacter = new Map(
    recommended.map((entry) => [entry.char, entry]),
  );
  const guidanceByCharacter = new Map(
    guidance.entries.map((entry) => [entry.char, entry]),
  );
  const entries = reviewConfig.map((config) => {
    const source = guidanceByCharacter.get(config.char)?.evidence;
    if (!source) {
      throw new Error(`初步建议缺少字符“${config.char}”的来源证据`);
    }
    const dictionaryEntries = cedict.get(config.char) ?? [];
    if (!dictionaryEntries.length) {
      throw new Error(`CC-CEDICT 缺少字符“${config.char}”`);
    }

    const exactHomophones = config.exactHomophones.map((char) => {
      const matches = (cedict.get(char) ?? []).filter(
        ({ pinyin }) =>
          normalizePinyin(pinyin) === normalizePinyin(source.facts.pinyin),
      );
      if (!matches.length) {
        throw new Error(
          `CC-CEDICT 未验证字符“${config.char}”的同音风险字“${char}”`,
        );
      }
      return {
        char,
        entries: matches.map(({ pinyin, definitions }) => ({
          pinyin,
          definitions,
        })),
      };
    });

    const pairSamples = config.samplePairs.map((pair) => {
      const pairCharacters = [...pair];
      if (
        pairCharacters.length !== 2 ||
        !pairCharacters.includes(config.char)
      ) {
        throw new Error(`字符“${config.char}”包含无效双字样例“${pair}”`);
      }
      const partner = pairCharacters.find((char) => char !== config.char);
      const partnerEntry = recommendedByCharacter.get(partner);
      if (!partnerEntry) {
        throw new Error(`双字样例“${pair}”的搭配字不在当前推荐层`);
      }
      const pinyin = pairCharacters.map((char) =>
        char === config.char ? source.facts.pinyin : partnerEntry.pinyin,
      );
      const sharedStyles = source.source.styleTags.filter((style) =>
        partnerEntry.naming.styleTags.includes(style),
      );
      return {
        pair,
        pinyin,
        partner: {
          char: partnerEntry.char,
          meaning: partnerEntry.meanings.modern,
          styleTags: partnerEntry.naming.styleTags,
        },
        projectChecks: {
          currentGivenNameHomophoneMatches: assessCurrentHomophoneRules(
            pinyin,
            homophoneRules,
          ),
          sharedStyles,
        },
        evidenceBoundary:
          'sample for human review only; passing current project rules does not prove naturalness or full-name safety',
      };
    });

    const projectPairScreens = recommended.flatMap((partner) =>
      [
        {
          pair: config.char + partner.char,
          pinyin: [source.facts.pinyin, partner.pinyin],
        },
        {
          pair: partner.char + config.char,
          pinyin: [partner.pinyin, source.facts.pinyin],
        },
      ].map((pair) => ({
        ...pair,
        matches: assessCurrentHomophoneRules(pair.pinyin, homophoneRules),
      })),
    );
    const matchedProjectPairs = projectPairScreens.filter(
      ({ matches }) => matches.length > 0,
    );

    return {
      char: config.char,
      sourceEvidence: {
        meaning: source.source.meaning,
        pinyin: source.facts.pinyin,
        styleTags: source.source.styleTags,
      },
      dictionaryReview: {
        entries: dictionaryEntries.map(
          ({ traditional, simplified, pinyin, definitions }) => ({
            traditional,
            simplified,
            pinyin,
            definitions,
          }),
        ),
      },
      homophoneReview: {
        riskLevel: config.riskLevel,
        exactHomophones,
        projectGivenNamePairScreen: {
          screenedPairs: projectPairScreens.length,
          matchedPairs: matchedProjectPairs.length,
          matches: matchedProjectPairs,
          ruleSource:
            'src/data/badHomophones.ts; given-name scope only; surname-dependent scopes not evaluated',
        },
        surnameDependentRiskChecked: false,
      },
      pairReview: {
        samples: pairSamples,
        naturalnessVerified: false,
      },
      recommendation: {
        value: config.recommendation,
        rationale: config.rationale,
        finalDecisionWritten: false,
      },
    };
  });

  const recommendations = countBy(
    entries,
    ({ recommendation }) => recommendation.value,
  );
  const riskLevels = countBy(
    entries,
    ({ homophoneReview }) => homophoneReview.riskLevel,
  );
  const counts = {
    total: entries.length,
    recommendations: {
      approveCandidate: recommendations['approve-candidate'] ?? 0,
      needsHumanJudgment: recommendations['needs-human-judgment'] ?? 0,
      rejectCandidate: recommendations['reject-candidate'] ?? 0,
    },
    homophoneRisk: {
      high: riskLevels.high ?? 0,
      medium: riskLevels.medium ?? 0,
      low: riskLevels.low ?? 0,
    },
    finalDecisionsWritten: 0,
  };
  if (
    counts.total !== 9 ||
    counts.recommendations.approveCandidate !== 2 ||
    counts.recommendations.needsHumanJudgment !== 4 ||
    counts.recommendations.rejectCandidate !== 3 ||
    counts.homophoneRisk.high !== 3 ||
    counts.homophoneRisk.medium !== 5 ||
    counts.homophoneRisk.low !== 1
  ) {
    throw new Error(`适名性复核计数异常：${JSON.stringify(counts)}`);
  }

  return {
    schemaVersion: 1,
    batchId: independentReview.batchId,
    sourceIndependentReview: {
      path: 'docs/recommended-character-independent-review-batch-01.json',
      sha256: sha256(independentReviewText),
    },
    sources: {
      dictionary: {
        name: 'CC-CEDICT',
        publisher: 'MDBG',
        release: cedictRelease,
        downloadUrl:
          'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
        decompressedSha256: sha256(cedictText),
        license: 'CC BY-SA 4.0',
        attributionUrl:
          'https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
      },
      projectHomophoneRules: {
        path: 'src/data/badHomophones.ts',
        sha256: sha256(badHomophonesText),
      },
      recommendedLayer: {
        path: 'public/data/characters/recommended-v2.json',
        sha256: sha256(recommendedText),
        enabledCharacters: recommended.length,
      },
    },
    policy: {
      nonBinding:
        'recommendations are a prepared sign-off worksheet, not review.decision values',
      machineCheckBoundary:
        'the pair screen only applies current project rules to given-name syllables; it does not check surname-dependent readings, dialects, every negative homophone or human-perceived naturalness',
      requiredForApproval:
        'a named human reviewer must choose the final decision, verify the actual surname and complete name, provide a reason, and record a canonical UTC timestamp',
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
    '# 推荐字适名性签署前复核',
    '',
    '> 本文对 9 个独立证据支持字补充完整词典义项、单字同音风险和双字样例机器检查。所有结论均为非绑定建议；未填写人工审校人、具体姓氏和完整姓名前，不写入最终批准或拒绝。',
    '',
    `- 批次：\`${result.batchId}\``,
    `- 可进入人工批准候选：${result.counts.recommendations.approveCandidate}`,
    `- 仍需人工判断：${result.counts.recommendations.needsHumanJudgment}`,
    `- 建议拒绝：${result.counts.recommendations.rejectCandidate}`,
    `- 同音风险：高 ${result.counts.homophoneRisk.high}、中 ${result.counts.homophoneRisk.medium}、低 ${result.counts.homophoneRisk.low}`,
    `- 已写入最终决定：${result.counts.finalDecisionsWritten}`,
    `- 运行时影响：\`${result.policy.runtimeEffect}\``,
    '',
    '## 证据边界',
    '',
    '- CC-CEDICT 用于补齐多义项、异读和同音字，生成内容按 CC BY-SA 4.0 保留署名与许可。',
    '- 双字样例只检查当前项目的 given-name 谐音规则和风格标签，不代表自然度已经人工确认。',
    '- 未提供姓氏，因此未执行完整姓名及“姓 + 名首字”检查；方言和地区读音也不在本轮结论内。',
    '',
    '| 字 | CC-CEDICT 义项 | 完全同音风险字 | 风险 | 项目组合命中 | 双字样例 | 非绑定建议 | 理由 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const entry of result.entries) {
    const definitions = entry.dictionaryReview.entries
      .map(
        ({ pinyin, definitions: senses }) =>
          `${pinyin}: ${senses.join('；')}`,
      )
      .join(' / ');
    const homophones = entry.homophoneReview.exactHomophones
      .map(({ char }) => char)
      .join('、');
    const samples = entry.pairReview.samples
      .map(({ pair, pinyin }) => `${pair}（${pinyin.join(' ')}）`)
      .join('、');
    const projectMatches =
      entry.homophoneReview.projectGivenNamePairScreen.matches.length > 0
        ? entry.homophoneReview.projectGivenNamePairScreen.matches
            .map(
              ({ pair, matches }) =>
                `${pair}→${matches.map(({ label }) => label).join('、')}`,
            )
            .join('；')
        : '0';
    lines.push(
      `| ${entry.char} | ${escapeMarkdown(definitions)} | ${homophones} | ${entry.homophoneReview.riskLevel} | ${escapeMarkdown(projectMatches)} | ${samples} | ${entry.recommendation.value} | ${escapeMarkdown(entry.recommendation.rationale)} |`,
    );
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export async function main(args = process.argv.slice(2)) {
  const cedictPath = args[0];
  const independentReviewPath =
    args[1] ?? 'docs/recommended-character-independent-review-batch-01.json';
  const guidancePath =
    args[2] ?? 'docs/recommended-character-review-guidance-batch-01.json';
  const recommendedPath =
    args[3] ?? 'public/data/characters/recommended-v2.json';
  const badHomophonesPath = args[4] ?? 'src/data/badHomophones.ts';
  const jsonOutputPath =
    args[5] ?? 'docs/recommended-character-suitability-review-batch-01.json';
  const markdownOutputPath =
    args[6] ?? 'docs/recommended-character-suitability-review-batch-01.md';
  if (!cedictPath) {
    throw new Error('请提供固定 SHA-256 的 CC-CEDICT 解压文本文件');
  }

  const [
    independentReviewText,
    guidanceText,
    recommendedText,
    badHomophonesText,
    cedictText,
  ] = await Promise.all(
    [
      independentReviewPath,
      guidancePath,
      recommendedPath,
      badHomophonesPath,
      cedictPath,
    ].map((filePath) => readFile(filePath, 'utf8')),
  );
  const result = buildSuitabilityReview({
    independentReviewText,
    guidanceText,
    recommendedText,
    badHomophonesText,
    cedictText,
  });
  await Promise.all([
    writeFile(jsonOutputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8'),
    writeFile(markdownOutputPath, toMarkdown(result), 'utf8'),
  ]);
  console.log(
    `已复核 ${result.counts.total} 字：批准候选 ${result.counts.recommendations.approveCandidate}、仍需人工判断 ${result.counts.recommendations.needsHumanJudgment}、建议拒绝 ${result.counts.recommendations.rejectCandidate}；最终决定 0，运行时影响 none。`,
  );
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
