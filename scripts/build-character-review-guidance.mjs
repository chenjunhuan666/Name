import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const batchPath =
  process.argv[2] ?? 'docs/recommended-character-review-batch-01.json';
const jsonOutputPath =
  process.argv[3] ?? 'docs/recommended-character-review-guidance-batch-01.json';
const markdownOutputPath =
  process.argv[4] ?? 'docs/recommended-character-review-guidance-batch-01.md';

const suggestionGroups = [
  {
    suggestion: 'retain-for-independent-check',
    label: '建议保留进入独立复核',
    reasonCode: 'plausible-positive-meaning',
    rationale:
      '现有来源释义呈现正向品质、自然意象或较明确的人名用字可能性；仍需独立词典和真实姓名用例支持后才能批准。',
    requiredCheck: '核对规范词典义项、常见姓名用例、谐音与双字搭配。',
    characters: [
      '充',
      '攀',
      '涧',
      '夙',
      '讴',
      '诤',
      '柢',
      '颀',
      '皑',
      '嵋',
      '弼',
      '鹭',
      '鎏',
      '铖',
      '恳',
      '禀',
      '玎',
      '谌',
      '濂',
    ],
  },
  {
    suggestion: 'likely-reject',
    label: '建议拒绝',
    reasonCode: 'concrete-object-creature-or-physical-state',
    rationale:
      '主要联想偏具体物件、动物、食物、身体状态或日常称谓，不宜作为默认推荐人名用字。',
    requiredCheck: '除非存在稳定、正向且可核验的姓名用例，否则维持拒绝建议。',
    characters: [
      '兔',
      '舰',
      '貂',
      '茸',
      '笋',
      '篱',
      '邸',
      '胄',
      '钺',
      '腴',
      '馐',
      '踵',
      '膳',
      '镯',
      '鬟',
      '孩',
      '伙',
      '饴',
      '庖',
      '胭',
      '脍',
      '犊',
      '篝',
    ],
  },
  {
    suggestion: 'likely-reject',
    label: '建议拒绝',
    reasonCode: 'action-or-dependent-context',
    rationale:
      '主要义项偏动作、功能或依赖特定语境，单独作为人名用字时语义不稳定。',
    requiredCheck: '若不能证明独立人名义项和自然搭配，则维持拒绝建议。',
    characters: [
      '懂',
      '谅',
      '祷',
      '企',
      '恤',
      '烹',
      '揽',
      '酿',
      '皈',
      '犒',
      '赡',
      '抉',
      '狩',
      '飨',
    ],
  },
  {
    suggestion: 'likely-reject',
    label: '建议拒绝',
    reasonCode: 'sound-interjection-or-weak-expression',
    rationale:
      '主要联想是叫声、语气词、怒斥或微弱声态，作为默认推荐人名用字风险较高。',
    requiredCheck: '若无明确正向人名义项，维持拒绝建议。',
    characters: ['咤', '喃', '嘹', '呦', '咩', '啾', '嘤'],
  },
  {
    suggestion: 'likely-reject',
    label: '建议拒绝',
    reasonCode: 'explicit-aggressive-meaning',
    rationale: '来源释义直接包含凶猛联想，且已命中含义风险词。',
    requiredCheck: '默认拒绝；不得仅因来源 sentiment=positive 而批准。',
    characters: ['鸷'],
  },
  {
    suggestion: 'needs-disambiguation',
    label: '需进一步核验',
    reasonCode: 'fixed-expression-polysemy-or-cultural-context',
    rationale:
      '可能依赖固定词组、多音多义、地名姓氏或特定文化意象，现有简短释义不足以支持批准或拒绝。',
    requiredCheck: '优先核对完整义项、读音、固定搭配来源和真实姓名使用情况。',
    characters: [
      '湃',
      '矜',
      '菖',
      '萏',
      '跹',
      '髦',
      '箐',
      '銮',
      '踔',
      '衢',
      '苞',
      '徕',
      '嶂',
      '箬',
      '箜',
      '鲛',
      '蹁',
      '嬴',
      '燧',
    ],
  },
];

const batchText = await readFile(batchPath, 'utf8');
const batch = JSON.parse(batchText);
if (!Array.isArray(batch.entries)) {
  throw new Error('审校批次格式错误：缺少 entries 数组');
}
if (
  batch.entries.some(
    ({ review }) =>
      review.decision !== 'pending' ||
      review.note !== '' ||
      review.reviewedBy !== '' ||
      review.reviewedAt !== '',
  )
) {
  throw new Error('初步建议清单只能从尚未填写最终决定的审校批次生成');
}

const assignmentByCharacter = new Map();
for (const group of suggestionGroups) {
  for (const char of group.characters) {
    if (assignmentByCharacter.has(char)) {
      throw new Error(`建议分组重复包含字符“${char}”`);
    }
    assignmentByCharacter.set(char, group);
  }
}

const batchCharacters = new Set(batch.entries.map(({ char }) => char));
const missing = batch.entries
  .filter(({ char }) => !assignmentByCharacter.has(char))
  .map(({ char }) => char);
const extra = [...assignmentByCharacter.keys()].filter(
  (char) => !batchCharacters.has(char),
);
if (missing.length || extra.length) {
  throw new Error(
    `建议分组未与审校批次逐字对齐：缺少=${missing.join('')}，多余=${extra.join('')}`,
  );
}

const entries = batch.entries.map(({ char, evidence }) => {
  const group = assignmentByCharacter.get(char);
  return {
    char,
    evidence,
    guidance: {
      suggestion: group.suggestion,
      label: group.label,
      reasonCode: group.reasonCode,
      rationale: group.rationale,
      requiredCheck: group.requiredCheck,
      finalDecisionWritten: false,
    },
  };
});
const counts = {
  total: entries.length,
  retainForIndependentCheck: entries.filter(
    ({ guidance }) => guidance.suggestion === 'retain-for-independent-check',
  ).length,
  likelyReject: entries.filter(
    ({ guidance }) => guidance.suggestion === 'likely-reject',
  ).length,
  needsDisambiguation: entries.filter(
    ({ guidance }) => guidance.suggestion === 'needs-disambiguation',
  ).length,
  finalDecisionsWritten: 0,
};
if (
  counts.total !== 83 ||
  counts.retainForIndependentCheck !== 19 ||
  counts.likelyReject !== 45 ||
  counts.needsDisambiguation !== 19
) {
  throw new Error(`初步建议分组计数异常：${JSON.stringify(counts)}`);
}

const guidance = {
  schemaVersion: 1,
  batchId: batch.batchId,
  sourceBatch: {
    path: batchPath,
    sha256: createHash('sha256').update(batchText).digest('hex'),
  },
  policy: {
    evidenceBoundary:
      'preliminary guidance based only on the fixed source meaning, usage, rarity and risk flags; it is not an independent dictionary or personal-name corpus verification',
    nonBinding:
      'guidance must never be copied automatically into review.decision; a human reviewer must make and record every final decision',
    runtimeEffect: 'none',
  },
  counts,
  entries,
};

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

const markdown = [
  '# 推荐字首批人工审校建议清单',
  '',
  '> 本文仅根据固定来源中的简短释义、适用度、生僻度与风险标记生成非绑定建议；未使用独立规范词典或真实姓名语料完成复核，不得据此自动写入 `approved/rejected`。',
  '',
  `- 批次：\`${batch.batchId}\``,
  `- 总数：${counts.total}`,
  `- 建议保留进入独立复核：${counts.retainForIndependentCheck}`,
  `- 建议拒绝：${counts.likelyReject}`,
  `- 需进一步核验：${counts.needsDisambiguation}`,
  `- 已写入最终决定：${counts.finalDecisionsWritten}`,
  '',
];

for (const suggestion of [
  'retain-for-independent-check',
  'likely-reject',
  'needs-disambiguation',
]) {
  const groupEntries = entries.filter(
    ({ guidance: item }) => item.suggestion === suggestion,
  );
  markdown.push(`## ${groupEntries[0].guidance.label}`, '');
  markdown.push(
    '| 字 | 拼音 | 来源释义 | 适用度 | 生僻度 | 初步理由 | 后续核验 |',
    '|---|---|---|---:|---:|---|---|',
  );
  for (const entry of groupEntries) {
    markdown.push(
      `| ${entry.char} | ${entry.evidence.facts.pinyin} | ${escapeMarkdown(entry.evidence.source.meaning)} | ${entry.evidence.source.namingUsage} | ${entry.evidence.source.rarityLevel} | ${escapeMarkdown(entry.guidance.rationale)} | ${escapeMarkdown(entry.guidance.requiredCheck)} |`,
    );
  }
  markdown.push('');
}

await Promise.all([
  writeFile(jsonOutputPath, `${JSON.stringify(guidance, null, 2)}\n`, 'utf8'),
  writeFile(markdownOutputPath, `${markdown.join('\n')}\n`, 'utf8'),
]);
console.log(
  `已生成 ${counts.total} 字非绑定审校建议：保留复核 ${counts.retainForIndependentCheck}、建议拒绝 ${counts.likelyReject}、进一步核验 ${counts.needsDisambiguation}；最终决定 0。`,
);
