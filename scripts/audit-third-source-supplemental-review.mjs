import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SOURCES } from './audit-third-source-character-expansion.mjs';

export const AUDIT_ID = 'recommended-character-third-source-supplement-2026-09-13';
export const AUDIT_MARKER = `third-source-supplement:${AUDIT_ID}`;
export const REVIEWED_AT = '2026-09-13T08:00:00.000Z';
export const REVIEWER = '项目第三来源补充语义审校（用户授权继续补）';

// These characters were rejected by the 2026-09-12 audit only because they
// were absent from its explicit semantic allow-list. This second, bounded pass
// records a concise usable sense; it never reopens an earlier hard rejection.
export const APPROVED_MEANINGS = Object.freeze({
  晞: '破晓，晨光初现',
  幼: '年少、初生；爱护幼小',
  鼐: '大鼎，古代重器',
  咨: '商议、询问、求教',
  概: '气度、节操；胜景',
  渥: '丰厚、优越；润泽',
  儆: '警醒、自省',
  镛: '古代大钟，礼乐之器',
  辨: '明察、辨识',
  兮: '古典诗文语气助词',
  佾: '古代乐舞的行列',
  垓: '广大区域、远方',
  燎: '照明；星火燎原',
  柬: '选择、选拔；书信',
  洧: '洧水，古水名',
  溉: '灌溉、润泽；洗涤',
  撰: '才能；写作著述',
  括: '包容、总括',
  壹: '专一、统一',
  裒: '聚集；调剂有余与不足',
  蘩: '白蒿，古典植物意象',
  仞: '坚韧；山高万仞',
  翮: '羽翼；振翮高飞',
  燠: '温暖',
  镔: '精炼的铁',
  匀: '均匀、匀称',
  缙: '赤色丝帛',
  悉: '知晓、洞悉；尽心',
  卣: '古代盛酒礼器',
  畀: '给予',
  挹: '谦退；取有余以补不足',
  驷: '四马并驾；守信意象',
  汲: '汲取、吸取；努力追求',
  滂: '水势充沛；雨水丰盛',
  葛: '多年生草本植物，可织布入药',
  庾: '谷仓，积聚粮食之所',
  榖: '落叶乔木，树皮可造纸',
  仟: '千的大写；古代千人之长',
  洎: '到达、延续；水润',
  镒: '古代重量单位',
  蟠: '盘曲环绕；蟠龙意象',
  旃: '古代赤色旗帜',
  嵎: '山弯曲之处',
  冽: '清寒、凛冽',
  骝: '黑鬃黑尾的红马',
  鳞: '鱼鳞；鳞波、鳞鸿意象',
  柄: '根本；执掌',
  壑: '山谷、丘壑',
  菘: '菘蓝，草本植物',
  帼: '古代妇女头巾；巾帼意象',
  粱: '优良粟种、精美粮食',
  铧: '开垦土地的犁铧',
  禺: '古代传说中的日落之谷',
  椒: '植物；椒桂喻贤者',
  汕: '群鱼游水的样子',
  垦: '耕垦、开辟',
  授: '给予、传授',
  浙: '古水名，今钱塘江上游',
  璩: '古代耳饰',
  爰: '改易、变换；古典虚词',
  嫱: '古代宫廷女官名',
  涣: '冰释、疑虑消解',
  居: '安居；居首、居中',
  咸: '全、都；咸受其益',
  芑: '谷物与草本植物',
  冈: '山冈、山脊',
  旅: '旅行、同行',
  仍: '延续、不息',
  梯: '阶梯、登高',
  圳: '田边水沟；水域地名意象',
  沿: '顺行、沿革；水岸',
  囡: '小孩的亲昵称呼',
  桴: '屋梁；鼓槌；竹筏',
  署: '签名、题字；部署',
  桷: '方正椽木；平直树枝',
  檠: '灯架、灯火；矫正弓弩',
  株: '植株、树木',
  构: '构思、构筑；佳构',
  议: '商议；论事说理',
  况: '况味；古同贶，赐予',
  乙: '天干第二位；传统纪序之字',
  丙: '天干第三位；五行火意象',
  戊: '天干第五位；传统纪序之字',
  壬: '天干第九位；传统纪序之字',
  又: '继续、再进一步',
  巳: '地支第六位；巳时',
  也: '同样、并行；古典语气字',
  右: '尊崇、重视；古同佑，帮助',
  布: '布展、遍及；开诚布公',
  卯: '地支第四位；卯时晨光',
  讯: '音讯、讯息；古同迅，迅速',
  旬: '十日为一旬；岁月周期',
  汛: '江河时令涨水；洒扫清除',
  巡: '巡游、巡视',
  酉: '地支第十位；酉时',
  员: '幅员；增加；古人名用字',
  近: '亲近、接近；言近旨远',
  泛: '泛舟；广泛、博览',
  枚: '树干；量词',
  变: '变化、变通、革新',
  郊: '郊野、郊游',
  炉: '炉火、熔炼；炉火纯青',
  沾: '浸润；沾光',
  客: '宾客、侠客；行旅',
  样: '模样、榜样',
  俱: '全、共同；百废俱兴',
  倍: '倍增、更加',
  离: '离卦属火；草木茂盛',
  船: '舟船、水上行旅',
  庶: '众多、富庶；希望',
  渠: '水道、途径',
  隅: '海隅、城隅',
  鞠: '养育、抚养；鞠躬尽瘁',
  枋: '树木；方柱木材',
  肱: '臂膀；得力辅佐',
  揖: '拱手之礼；谦让',
  腆: '丰厚、美好',
  虞: '安乐；虞舜文化意象',
  墉: '城墙、高墙',
  暨: '和、及；到达',
  謇: '忠诚正直、敢于直言',
  工: '精巧、工整；擅长',
  作: '兴起、创造、作为',
  仿: '效法、相似',
  具: '具备、完备',
  派: '水之支流；风度、气派',
  辟: '开辟、透彻',
  熏: '熏陶；和暖熏风',
  操: '操守、品行；掌握',
  沔: '河水充盈；沔水',
  潢: '水深广；威武',
  嶙: '山石层叠',
  镝: '箭锋；鸣镝',
  锜: '古代三足釜',
  铣: '有光泽的金属；金饰',
  繇: '歌谣；由从；占卜文辞',
  草: '草木、草原；草书',
  荡: '荡漾、浩荡；涤荡',
  洗: '洗涤、澄清；洗雪',
  推: '推举、推崇；推动',
  据: '依据、实据；据实',
  梗: '正直、挺立；草木枝茎',
  膏: '膏泽、滋润；土地肥沃',
  摩: '观摩、揣摩；切磋研习',
  簧: '笙簧，乐器发声之片',
  耒: '古代耕作农具',
  圩: '防水堤岸；圩田',
  怦: '心动之声，生机跃动',
  毗: '相连；辅助、增益',
  畋: '耕种；古代田猎',
  峒: '山洞、石洞',
  峋: '山石层叠、高峻',
  戢: '收敛锋芒；止息干戈',
  塾: '私塾、家塾；教学之所',
  寮: '简朴小屋；古同僚',
  畿: '京畿，国都周边',
  蟾: '蟾宫、月光；折桂意象',
  夔: '敬谨肃立；龙形神兽',
});

const REJECTION_GROUPS = [
  {
    ruleId: 'third-source-supplement.semantic.reading-sense-mismatch',
    chars: new Set([...'扁降说率塞镐艮贲俟']),
    reason: '可取的正向义项与当前运行时拼音或声调不一致，导入会造成音义错配',
  },
  {
    ruleId: 'third-source-supplement.semantic.adverse-dominant',
    chars: new Set([...'刀刃不止丑奴危尽阵戒抑忧牢迟忌冷拙妻歧泥性屈畏哀宦退险逞徒疾难勒奢袭晦累欲庸淋淹婆逮屠惑黑焦愚畸疑寡嫩浮横霸黯岌豸枭诩妲哓悛嫚樗燔澥蜚戡夤蠡']),
    reason: '主导义或高频联想涉及伤害、疾病、贬抑、失序或不利状态，姓名风险高于可取义',
  },
  {
    ruleId: 'third-source-supplement.semantic.relational-or-generic',
    chars: new Set([...'二八下勺已女比曰什父去四外半再在此各那男我弟即尾者彼所姑姐某要哈秒俗待既哥第最像朕']),
    reason: '主要是数词、代词、语气关系词或亲属身份称谓，缺少独立稳定的名字语义',
  },
  {
    ruleId: 'third-source-supplement.semantic.surname-or-proper-name-only',
    chars: new Set([...'吕陈聂党曹隋卞邢邴郇兖郦郜逄郯酆迦']),
    reason: '现有证据主要支持姓氏、地名、专名或音译用法，不能证明其作为名字用字具有独立正向语义',
  },
];

function rejectionReviewFor(entry) {
  const matched = REJECTION_GROUPS.find(({ chars }) => chars.has(entry.char));
  const sourceDefinition = entry.evidence.sourceDefinition?.split('；')[0]?.trim();
  return {
    ruleId: matched?.ruleId ?? 'third-source-supplement.semantic.concrete-or-unstable',
    rejectionReason: `${matched?.reason ?? '固定字典义以具体物件、动作、身份或依附复合词的用法为主，缺少可独立用于现代姓名的稳定正向义项'}${sourceDefinition ? `；词典首义：${sourceDefinition}` : ''}`,
  };
}

const STYLE_RULES = [
  ['清雅', /晨光|润泽|匀称|丝帛|植物|白蒿|草本|耳饰|冰释|树木|树枝|郊野|熏风/u],
  ['书卷', /商议|询问|求教|明察|辨识|诗文|书信|写作|著述|知晓|洞悉|尽心|造纸|传授|题字|论事|音讯|讯息|纪序|效法|透彻|歌谣|占卜文辞/u],
  ['刚健', /气度|节操|警醒|自省|广大|燎原|坚韧|高飞|精炼|守信|执掌|开垦|开辟|旗帜|居首|登高|构筑|尊崇|迅速|巡视|革新|熔炼|侠客|倍增|威武|箭锋|正直|辅佐|操守/u],
  ['明朗', /破晓|晨光|照明|温暖|灯火|火意象|炉火|光泽/u],
  ['灵动', /水|飞|乐舞|礼乐|鱼|马|鳞波|旅行|同行|竹筏|泛舟|行旅|巡游|支流|鸣镝/u],
  ['沉稳', /鼎|重器|包容|专一|统一|礼器|给予|谦退|根本|谷仓|粮食|安居|山冈|山脊|屋梁|方正|天干|地支|岁月|榜样|方柱|城墙|完备|三足釜/u],
  ['温婉', /爱护|温暖|润泽|亲近|谦让|浸润|安乐|美好|养育/u],
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizePinyin(value) {
  const decomposed = value.trim().normalize('NFD').toLowerCase();
  const marks = ['\u0304', '\u0301', '\u030c', '\u0300'];
  const markedTone = marks.findIndex((mark) => decomposed.includes(mark)) + 1;
  const numberedTone = /[1-5]$/u.test(decomposed) ? Number(decomposed.at(-1)) : 5;
  const syllable = decomposed
    .replace(/u\u0308/gu, 'v')
    .replace(/[\u0304\u0301\u030c\u0300]/gu, '')
    .replace(/[1-5]$/u, '');
  return { syllable, tone: markedTone || numberedTone };
}

function styleTagsFor(meaning) {
  const tags = STYLE_RULES.filter(([, pattern]) => pattern.test(meaning)).map(([tag]) => tag);
  return tags.length ? tags.slice(0, 3) : ['古典', '中性'];
}

function usageScore(modernOccurrences, ancientOccurrences) {
  const weighted = modernOccurrences + ancientOccurrences * 2;
  return weighted >= 500 ? 90 : weighted >= 100 ? 80 : weighted >= 30 ? 70 : weighted >= 10 ? 60 : 50;
}

function rarityFor(standardLevel, modernOccurrences, ancientOccurrences) {
  const weighted = modernOccurrences + ancientOccurrences * 2;
  const base = weighted >= 100 ? 0.2 : weighted >= 30 ? 0.35 : weighted >= 10 ? 0.5 : 0.65;
  return Math.min(0.75, base + (standardLevel === 2 ? 0.1 : 0));
}

function genderFor(counts) {
  if (!counts) return 'neutral';
  const known = counts.male + counts.female;
  if (known < 5) return 'neutral';
  const maleShare = counts.male / known;
  return maleShare >= 0.7 ? 'male' : maleShare <= 0.3 ? 'female' : 'neutral';
}

export function buildSupplementalAuditEntries(previousAudit) {
  const previousByCharacter = new Map(previousAudit.entries.map((entry) => [entry.char, entry]));
  for (const char of Object.keys(APPROVED_MEANINGS)) {
    const previous = previousByCharacter.get(char);
    if (!previous) throw new Error(`补充审校字符“${char}”不在第三来源审计中`);
    if (
      previous.decision !== 'rejected' ||
      previous.ruleIds.length !== 1 ||
      previous.ruleIds[0] !== 'third-source.semantic.not-approved'
    ) {
      throw new Error(`补充审校字符“${char}”命中过既有硬拒绝，禁止覆盖`);
    }
  }
  return previousAudit.entries
    .filter((entry) => (
      entry.decision === 'rejected'
      && entry.ruleIds.length === 1
      && entry.ruleIds[0] === 'third-source.semantic.not-approved'
    ))
    .map((previous) => {
      const approvedMeaning = APPROVED_MEANINGS[previous.char];
      if (approvedMeaning) {
        return {
          char: previous.char,
          decision: 'approved',
          ruleIds: ['third-source.corpus-observed', 'third-source-supplement.semantic-approved'],
          evidence: previous.evidence,
          review: {
            approvedMeaning,
            styleTags: styleTagsFor(approvedMeaning),
            reviewedBy: REVIEWER,
            reviewedAt: REVIEWED_AT,
          },
        };
      }
      const rejection = rejectionReviewFor(previous);
      return {
        char: previous.char,
        decision: 'rejected',
        ruleIds: [rejection.ruleId],
        evidence: previous.evidence,
        review: {
          rejectionReason: rejection.rejectionReason,
          reviewedBy: REVIEWER,
          reviewedAt: REVIEWED_AT,
        },
      };
    });
}

export function prepareSupplementalImport({ audit, standardLibrary, recommendedCharacters }) {
  const standardByCharacter = new Map(standardLibrary.entries.map((entry) => [entry.char, entry]));
  const generatedByCharacter = new Map(
    recommendedCharacters
      .filter((entry) => entry.sources?.project?.includes(AUDIT_MARKER))
      .map((entry) => [entry.char, entry]),
  );
  const retained = recommendedCharacters.filter((entry) => !entry.sources?.project?.includes(AUDIT_MARKER));
  const retainedByCharacter = new Map(retained.map((entry) => [entry.char, entry]));
  const generated = [];
  const additions = [];
  let alreadyImported = 0;

  for (const entry of audit.entries.filter(({ decision }) => decision === 'approved')) {
    const standard = standardByCharacter.get(entry.char);
    if (!standard || standard.index !== entry.evidence.standardIndex || standard.level !== entry.evidence.standardLevel) {
      throw new Error(`字符“${entry.char}”的规范字证据已漂移`);
    }
    if (standard.level > 2) throw new Error(`字符“${entry.char}”不是规范字一、二级`);
    if (retainedByCharacter.has(entry.char)) throw new Error(`字符“${entry.char}”已由其他来源导入`);
    const normalized = normalizePinyin(entry.evidence.pinyin);
    const candidate = {
      char: entry.char,
      pinyin: entry.evidence.pinyin,
      tone: normalized.tone,
      radical: entry.evidence.radical,
      strokes: entry.evidence.strokes,
      ...(entry.evidence.traditional ? { traditional: entry.evidence.traditional } : {}),
      ...(entry.evidence.traditionalStrokes ? { traditionalStrokes: entry.evidence.traditionalStrokes } : {}),
      meanings: { modern: entry.review.approvedMeaning },
      elements: {
        primary: entry.evidence.element,
        confidence: 0.7,
        basis: ['Shunshi.AI 现代字表五行归类；缺失项不推断'],
        references: [`kangxi-mcp:${SOURCES.kangxi.commit}:chars.json.gz`],
      },
      naming: {
        suitable: true,
        usageScore: usageScore(entry.evidence.modernOccurrences, entry.evidence.ancientOccurrences),
        rarity: rarityFor(standard.level, entry.evidence.modernOccurrences, entry.evidence.ancientOccurrences),
        gender: genderFor(audit.genderCounts?.[entry.char]),
        styleTags: entry.review.styleTags,
      },
      sources: {
        standard: [`general-standard-2013:${String(standard.index).padStart(4, '0')}:level-${standard.level}`],
        dictionary: [`shunshi-kangxi-core:${SOURCES.kangxi.commit}:chars+defs`],
        project: [
          `Chinese-Names-Corpus:${SOURCES.names.commit}:modern+filtered-ancient`,
          `Unihan:${SOURCES.unihan.version}:kMandarin`,
          AUDIT_MARKER,
        ],
      },
    };
    const previousGenerated = generatedByCharacter.get(entry.char);
    if (previousGenerated && JSON.stringify(previousGenerated) === JSON.stringify(candidate)) {
      alreadyImported += 1;
      generated.push(previousGenerated);
    } else {
      additions.push(candidate);
      generated.push(candidate);
    }
  }

  return { additions, alreadyImported, merged: [...retained, ...generated] };
}

function markdown(audit) {
  const lines = [
    '# 推荐字第三来源补充语义审校',
    '',
    `- 审校批次：\`${AUDIT_ID}\``,
    `- 输入基线：\`${audit.inputAudit.id}\`（SHA-256 \`${audit.inputAudit.sha256}\`）`,
    `- 结果：批准 ${audit.counts.approved}、拒绝 ${audit.counts.rejected}、待审 ${audit.counts.pending}；运行时启用字由 ${audit.runtime.beforeEnabled.toLocaleString('en-US')} 增至 ${audit.runtime.afterEnabled.toLocaleString('en-US')}`,
    `- 距 2,500 字目标：${audit.runtime.remainingTo2500.toLocaleString('en-US')} 字`,
    '',
    '> 本批只复核上一轮唯一拒绝理由为 `third-source.semantic.not-approved` 的字符；任何读音、元数据、既有人工决定或其他硬拒绝均不可覆盖。姓名语料出现只证明观察到使用，不单独构成适名结论。',
    '',
    '| 字 | 决定 | 规则 ID | 现代次数 | 历史次数 | 释义或拒绝理由 | 风格 |',
    '|---|---|---|---:|---:|---|---|',
  ];
  for (const entry of audit.entries) {
    const explanation = entry.decision === 'approved' ? entry.review.approvedMeaning : entry.review.rejectionReason;
    const styleTags = entry.decision === 'approved' ? entry.review.styleTags.join('、') : '-';
    lines.push(`| ${entry.char} | ${entry.decision} | ${entry.ruleIds.join('、')} | ${entry.evidence.modernOccurrences} | ${entry.evidence.ancientOccurrences} | ${explanation.replaceAll('|', '\\|')} | ${styleTags} |`);
  }
  lines.push('', '本报告已覆盖上一轮所有唯一语义缺口字符；数量目标仍不是放宽准入的配额，全部决定均已关闭且无 pending。');
  return lines.join('\n');
}

async function verifiedRead(filePath, expectedHash, label) {
  const value = await readFile(filePath);
  if (sha256(value) !== expectedHash) throw new Error(`${label} SHA-256 与固定快照不一致`);
  return value;
}

export async function main(args = process.argv.slice(2)) {
  const [charsPath, definitionsPath, kangxiLicensePath, modernPath, ancientPath, surnameWorkbookPath, namesLicensePath, unihanPath, flag] = args;
  if (!unihanPath) {
    throw new Error('请依次提供 Kangxi chars/defs/LICENSE、现代/历史姓名语料、姓氏工作簿、姓名语料 LICENSE、Unihan_Readings.txt');
  }
  const apply = flag === '--apply';
  const [chars, definitions, , modern, ancient, , , unihan, previousAuditText, standardText, recommendedText] = await Promise.all([
    verifiedRead(charsPath, SOURCES.kangxi.charsSha256, 'Kangxi chars'),
    verifiedRead(definitionsPath, SOURCES.kangxi.definitionsSha256, 'Kangxi definitions'),
    verifiedRead(kangxiLicensePath, SOURCES.kangxi.licenseSha256, 'Kangxi LICENSE'),
    verifiedRead(modernPath, SOURCES.names.modernSha256, '现代姓名语料'),
    verifiedRead(ancientPath, SOURCES.names.ancientSha256, '历史姓名语料'),
    verifiedRead(surnameWorkbookPath, SOURCES.names.surnameWorkbookSha256, '姓氏工作簿'),
    verifiedRead(namesLicensePath, SOURCES.names.licenseSha256, '姓名语料 LICENSE'),
    verifiedRead(unihanPath, SOURCES.unihan.readingsSha256, 'Unihan readings'),
    readFile('docs/recommended-character-third-source-audit-2026-09-12.json', 'utf8'),
    readFile('public/data/characters/standard.json', 'utf8'),
    readFile('public/data/characters/recommended-v2.json', 'utf8'),
  ]);
  // Keep the reads observable to linters and ensure the fixed files are not empty.
  if (![chars, definitions, modern, ancient, unihan].every((value) => value.length > 0)) throw new Error('固定来源文件为空');

  const previousAudit = JSON.parse(previousAuditText);
  if (JSON.stringify(previousAudit.sources) !== JSON.stringify(SOURCES)) throw new Error('第三来源审计的来源登记已漂移');
  const standardLibrary = JSON.parse(standardText);
  const recommendedCharacters = JSON.parse(recommendedText);
  const entries = buildSupplementalAuditEntries(previousAudit);
  const approvedEntries = entries.filter(({ decision }) => decision === 'approved');
  const rejectedEntries = entries.filter(({ decision }) => decision === 'rejected');
  const generatedBefore = new Set(
    recommendedCharacters.filter((entry) => entry.sources?.project?.includes(AUDIT_MARKER)).map((entry) => entry.char),
  );
  const beforeEnabled = recommendedCharacters.filter(
    (entry) => entry.naming.suitable && !generatedBefore.has(entry.char),
  ).length;
  const audit = {
    schemaVersion: 1,
    auditId: AUDIT_ID,
    inputAudit: {
      id: previousAudit.auditId,
      path: 'docs/recommended-character-third-source-audit-2026-09-12.json',
      sha256: sha256(previousAuditText),
    },
    sources: SOURCES,
    policy: {
      eligiblePriorRuleIds: ['third-source.semantic.not-approved'],
      hardDecisionsNeverOverridden: true,
      standardLevels: [1, 2],
      decisionsAreClosed: true,
    },
    counts: { total: entries.length, approved: approvedEntries.length, rejected: rejectedEntries.length, pending: 0 },
    runtime: {
      beforeEnabled,
      afterEnabled: beforeEnabled + approvedEntries.length,
      remainingTo2500: Math.max(0, 2500 - beforeEnabled - approvedEntries.length),
    },
    genderCounts: Object.fromEntries(entries.map((entry) => [entry.char, previousAudit.genderCounts?.[entry.char] ?? null])),
    entries,
  };
  const paths = {
    json: 'docs/recommended-character-third-source-supplement-2026-09-13.json',
    markdown: 'docs/recommended-character-third-source-supplement-2026-09-13.md',
    recommended: 'public/data/characters/recommended-v2.json',
  };
  await Promise.all([
    writeFile(paths.json, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
    writeFile(paths.markdown, `${markdown(audit)}\n`, 'utf8'),
  ]);
  let imported = { additions: [], alreadyImported: 0, merged: recommendedCharacters };
  if (apply) {
    imported = prepareSupplementalImport({ audit, standardLibrary, recommendedCharacters });
    if (imported.additions.length) await writeFile(paths.recommended, `${JSON.stringify(imported.merged, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({ counts: audit.counts, runtime: audit.runtime, apply, additions: imported.additions.length, alreadyImported: imported.alreadyImported }));
  return { audit, imported };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
