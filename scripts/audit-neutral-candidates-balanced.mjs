import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { parseUnihanReadings } from './build-character-independent-review.mjs';
import { scanPendingPairs } from './build-pending-character-pairs.mjs';
import { validateReviewBatch } from './import-approved-character-reviews.mjs';

const UNIHAN_SHA256 = '575e69c9ad85a4737a889a4f94cbd987042a90a1a6cc16dd3f4ed995c715b17c';
const MASS_REVIEW_PREFIX = '用户授权一次性完成中性候选审校。';
const REVIEWER = '项目平衡型批量审校（用户授权）：01a06ee1-4a74-71c1-8904-a0d60283e9d3';

const rejectPatterns = [
  ['neutral.semantic.negative', /荒|暗|昏|迷|愁|忧|悲|病|罪|死|终|亡|寂|空|无|废|丧|衰|弱|险|怒|凶|恶|杀|伤|血|毒|乱|辱|耻|污|灾|祸|苦|痛|疲|残|闭|阻|遏|逃|隐|孤|独|寐|瞑|昧/u],
  ['neutral.semantic.function', /助词|疑问|数字|量词|词缀|代词|介词|连词|副词|语气|项目|等级|区域|制度|法律|政治|计算|记录|使用|设计|评论|监督|命令|事务|方式|样式|符号|标签|名额|栏目|标题/u],
  ['neutral.semantic.role-or-surname', /姓氏|古国名|丈夫|男子|人类|人民|后代|子嗣|军人|师傅|厨师|主人|司令/u],
  ['neutral.semantic.object-or-body', /器|车辆|军舰|手镯|栏杆|墙壁|额头|嘴唇|身体|脚后跟|厨房|房舍|居室|池塘|港湾|道路|田界|油漆|线条|书写|灯芯|手艺|热汤|饮食|美食|首饰/u],
  ['neutral.semantic.action', /归还|返回|展开|开张|指挥|挥洒|计划|计算|记忆|记录|重视|聆听|执持|交往|经营|谋求|演绎|震动|追求|尝试|驾驶|寄居|种植|修饰|注视|编织|跟随|储备|叙述|俯瞰|揣度|切磋|斟酌|迁徙|射击|骑马|摄取|驱赶|承载|拜访|陪同|镶嵌|跳跃|修葺|震慑/u],
];
const positivePattern = /圆满|洁白|纯净|向往|思想|坚定|交际|镇定|安镇|气度|厚重|斯文|高洁|田野|未来|根本|善治|独立|启示|专注|自信|运气|通达|炎热|引领|疏朗|蓬勃|安详|响亮|觉悟|通透|深邃|书卷|清雅|明朗|温婉|灵动|刚健/u;

function sha256(text) { return createHash('sha256').update(text).digest('hex'); }
function normalizedPinyin(value) {
  const decomposed = value.trim().normalize('NFD').toLowerCase();
  const tones = ['\u0304', '\u0301', '\u030c', '\u0300'];
  const tone = tones.findIndex((mark) => decomposed.includes(mark)) + 1 || 5;
  return `${decomposed.replace(/u\u0308/gu, 'v').replace(/[\u0304\u0301\u030c\u0300]/gu, '')}${tone}`;
}
function parseCoverage(text) {
  return new Set(text.trim().split(/\r?\n/u).slice(1).map((line) => line.slice(0, line.indexOf(','))).filter(Boolean));
}
function usagePoints(value) { return value >= 60 ? 10 : value >= 50 ? 8 : value >= 45 ? 6 : value >= 40 ? 4 : 0; }
function rarityPoints(value) { return value === 0 ? 8 : value === 1 ? 5 : 2; }
function restoreMassClosure(entry) {
  if (entry.review.reviewedBy !== '用户（本会话授权）：01a06ee1-4a74-71c1-8904-a0d60283e9d3' || !entry.review.note.startsWith(MASS_REVIEW_PREFIX)) return entry;
  return { ...entry, review: { decision: 'pending', note: '', approvedMeaning: '', reviewedBy: '', reviewedAt: '' } };
}
function classify({ entry, lexical, covered, pair }) {
  const meaning = entry.evidence.source.meaning;
  const readings = lexical?.kMandarin?.trim().split(/\s+/u) ?? [];
  const expected = normalizedPinyin(entry.evidence.facts.pinyin);
  const matches = readings.some((reading) => normalizedPinyin(reading) === expected);
  const ruleIds = [];
  if (!matches) ruleIds.push('neutral.reading.mismatch');
  if (readings.length > 1) ruleIds.push('neutral.reading.multiple');
  for (const [id, pattern] of rejectPatterns) if (pattern.test(meaning)) ruleIds.push(id);
  if (pair.counts.homophoneRejected > 0) ruleIds.push('neutral.pair.exact-homophone');
  if (ruleIds.length) return { decision: 'rejected', score: 0, ruleIds, readings, covered };
  const semanticPoints = positivePattern.test(meaning) ? 22 : 0;
  const score = 30 + Number(covered) * 20 + usagePoints(entry.evidence.source.namingUsage) + rarityPoints(entry.evidence.source.rarityLevel) + 10 + semanticPoints;
  if (score >= 70) return { decision: 'approved', score, ruleIds: ['neutral.score.approve', ...(semanticPoints ? ['neutral.semantic.positive'] : [])], readings, covered };
  return { decision: 'rejected', score, ruleIds: ['neutral.score.below-approve-threshold'], readings, covered };
}
function markdown(result) {
  const lines = ['# 中性候选平衡型批量审校', '', '> 本报告为项目默认推荐池的批量准入结果，不对现实世界中某个字能否用于具体人名作绝对判断。', '', `- 决定：批准 ${result.counts.approved}、拒绝 ${result.counts.rejected}、待审 ${result.counts.pending}`, `- 阈值：总分至少 70 且未命中硬拒绝规则才批准。`, '', '| 字 | 决定 | 分数 | 规则 | 来源释义 | 姓名覆盖 |', '|---|---|---:|---|---|---|'];
  for (const item of result.entries) lines.push(`| ${item.char} | ${item.decision} | ${item.score} | ${item.ruleIds.join('、')} | ${item.meaning.replaceAll('|', '\\|')} | ${item.covered ? 'present' : 'absent'} |`);
  lines.push('', '硬拒绝：读音不一致或多读音、负面义、功能/姓氏角色、具体器物身体、动作依赖语境，以及现有给定名范围的精确同音组合命中。分数由读音一致、历史姓名覆盖、来源适用度、生僻度、组合安全和正向语义组成。', '');
  return lines.join('\n');
}

export async function main(args = process.argv.slice(2)) {
  const [unihanPath, namesPath] = args;
  if (!unihanPath || !namesPath) throw new Error('请提供 Unihan_Readings.txt 和 givenname.csv');
  const paths = { batch: 'docs/recommended-character-review-batch-02-neutral.json', queue: 'docs/recommended-character-review.json', recommended: 'public/data/characters/recommended-v2.json' };
  const [batchText, queueText, recommendedText, unihanText, namesText] = await Promise.all([readFile(paths.batch, 'utf8'), readFile(paths.queue, 'utf8'), readFile(paths.recommended, 'utf8'), readFile(unihanPath, 'utf8'), readFile(namesPath, 'utf8')]);
  if (sha256(unihanText) !== UNIHAN_SHA256) throw new Error('Unihan 输入不是固定 17.0.0 快照');
  const restored = { ...JSON.parse(batchText), entries: JSON.parse(batchText).entries.map(restoreMassClosure) };
  const restoredCounts = restored.entries.reduce((all, entry) => ({ ...all, [entry.review.decision]: all[entry.review.decision] + 1 }), { pending: 0, approved: 0, rejected: 0 });
  if (restoredCounts.pending !== 971 || restoredCounts.rejected !== 17 || restoredCounts.approved !== 0) throw new Error(`不能从预期状态恢复批次：${JSON.stringify(restoredCounts)}`);
  const lexical = { entries: restored.entries.filter((entry) => entry.review.decision === 'pending').map((entry) => ({ char: entry.char, sourceEvidence: entry.evidence, reviewFlags: [], previousSuggestion: { suggestion: 'balanced-audit' } })) };
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  let pairs;
  try {
    const [{ assessSemanticPair }, { passesSemanticFilter }, { assessHomophone }] = await Promise.all([server.ssrLoadModule('/src/core/naming/semanticPair.ts'), server.ssrLoadModule('/src/core/naming/filters/semanticFilter.ts'), server.ssrLoadModule('/src/core/naming/homophone.ts')]);
    pairs = scanPendingPairs({ batch: restored, recommended: JSON.parse(recommendedText), lexical, assessSemanticPair, passesSemanticFilter, assessHomophone });
  } finally { await server.close(); }
  const unihan = parseUnihanReadings(unihanText); const coverage = parseCoverage(namesText); const byChar = new Map(pairs.entries.map((entry) => [entry.char, entry])); const reviewedAt = new Date().toISOString();
  const auditEntries = restored.entries.filter((entry) => entry.review.decision === 'pending').map((entry) => ({ entry, result: classify({ entry, lexical: unihan.get(entry.char), covered: coverage.has(entry.char), pair: byChar.get(entry.char) }) }));
  const updated = { ...restored, entries: restored.entries.map((entry) => { const audit = auditEntries.find(({ entry: candidate }) => candidate.char === entry.char); if (!audit) return entry; const { result } = audit; return { ...entry, review: { decision: result.decision, note: `平衡型批量审校：${result.ruleIds.join('、')}；得分 ${result.score}。来源释义“${entry.evidence.source.meaning}”。`, approvedMeaning: result.decision === 'approved' ? entry.evidence.source.meaning : '', reviewedBy: REVIEWER, reviewedAt } }; }) };
  const counts = updated.entries.reduce((all, entry) => ({ ...all, [entry.review.decision]: all[entry.review.decision] + 1 }), { pending: 0, approved: 0, rejected: 0 }); updated.counts = { ...updated.counts, total: updated.entries.length, ...counts };
  validateReviewBatch(updated, queueText);
  const result = { schemaVersion: 1, batchId: updated.batchId, sources: { unihanSha256: sha256(unihanText), chineseNamesSha256: sha256(namesText), pairCounts: pairs.counts }, policy: { decisionMeaning: 'default-recommendation admission only', approveThreshold: 70, hardRejectRuleGroups: rejectPatterns.map(([id]) => id), decisionsChanged: 971 }, counts, entries: auditEntries.map(({ entry, result }) => ({ char: entry.char, meaning: entry.evidence.source.meaning, decision: result.decision, score: result.score, ruleIds: result.ruleIds, covered: result.covered, readings: result.readings })) };
  await Promise.all([writeFile(paths.batch, `${JSON.stringify(updated, null, 2)}\n`, 'utf8'), writeFile('docs/recommended-character-neutral-balanced-audit-2026-09-10.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8'), writeFile('docs/recommended-character-neutral-balanced-audit-2026-09-10.md', `${markdown(result)}\n`, 'utf8')]);
  console.log(JSON.stringify({ counts, reviewedAt, pairCounts: pairs.counts }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
