import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { parseNameCorpus } from './audit-second-source-name-corpus.mjs';

export const SOURCES = Object.freeze({
  kangxi: {
    project: 'shunshi-ai/kangxi-mcp',
    repository: 'https://github.com/shunshi-ai/kangxi-mcp',
    commit: 'fad0bdf7c34b0ec555edbb2af91db737825a4beb',
    license: 'MIT',
    charsSha256: 'ed0b463597e3f057bbd265ca1d8cfe7b426d34bc7a3c5aa332d77a63989cd9f2',
    definitionsSha256: '2c0acb2f7deace4341be91119b36ceaadb53675d79c96c7df14580a179782a5b',
    licenseSha256: '73fc4434dc41d6802fd019fc0c19d899bb50f019fddad6dd81248d174b30029f',
  },
  names: {
    project: 'wainshine/Chinese-Names-Corpus',
    repository: 'https://github.com/wainshine/Chinese-Names-Corpus',
    commit: '47d4af8d816f6212787ddfc49173cac3b994b58d',
    license: 'Apache-2.0',
    modernSha256: '30d83f3e682d355ac1d3f18482c14ff5e2bdd0ebe704bff1ef196eabdf93939b',
    ancientSha256: 'cc672845c615a7815fadb9f4a7d6b70459b37bad4ae1d336bd988897afa4661a',
    surnameWorkbookSha256: 'c0ec61ece459e1527f692bff9d1bb8d184f49d48966659b1eb3822769e8f28b6',
    licenseSha256: 'e03ba41d7fab20700769fe4118bab50d800cb74f990353a05d2f5fff1c228363',
  },
  unihan: {
    version: '17.0.0',
    officialPage: 'https://www.unicode.org/versions/Unicode17.0.0/',
    readingsSha256: '575e69c9ad85a4737a889a4f94cbd987042a90a1a6cc16dd3f4ed995c715b17c',
  },
});

const MIN_CORPUS_OCCURRENCES = 5;
const EXPECTED_MODERN_NAMES = 1_144_226;
const EXPECTED_MODERN_UNIQUE_CHARACTERS = 2_238;
const EXPECTED_ANCIENT_NAMES = 115_898;
const EXPECTED_ANCIENT_UNIQUE_CHARACTERS = 4_909;
const REVIEWED_AT = '2026-09-12T08:00:00.000Z';
const REVIEWER = '项目第三来源固定规则审校（用户授权 V2.3）';
const AUDIT_MARKER = 'third-source-audit:recommended-character-expansion-2026-09-12';

// The first 200 rows of the fixed surname workbook, whose second column is
// descending frequency. Restricting the mixed historical corpus to these
// surnames and 2-3 character full names removes long transliterations.
export const TOP_SURNAMES = new Set(
  '王 李 张 刘 陈 杨 黄 吴 赵 周 徐 孙 马 朱 胡 林 郭 何 高 罗 郑 梁 谢 宋 唐 许 邓 冯 韩 曹 曾 彭 肖 蔡 潘 田 董 袁 于 余 蒋 叶 杜 苏 魏 程 吕 丁 沈 任 姚 卢 钟 姜 崔 谭 廖 范 汪 陆 金 石 戴 贾 韦 夏 邱 方 侯 邹 熊 孟 秦 白 毛 江 闫 薛 尹 付 段 雷 黎 史 龙 钱 贺 陶 顾 龚 郝 邵 万 严 洪 赖 武 傅 莫 孔 汤 向 常 温 康 施 文 牛 樊 葛 邢 安 齐 易 乔 伍 庞 颜 倪 庄 聂 章 鲁 岳 翟 申 殷 詹 欧 耿 关 覃 兰 焦 俞 左 柳 甘 祝 包 代 宁 符 阮 尚 舒 纪 柯 梅 童 毕 凌 单 季 成 霍 苗 裴 涂 谷 曲 盛 冉 翁 蓝 骆 路 游 靳 辛 欧阳 管 柴 蒙 鲍 华 喻 祁 房 蒲 滕 萧 屈 饶 解 牟 艾 尤 时 阳 阎 穆 应 农 司 古 吉 卓 车 简'.split(
    ' ',
  ),
);

// Each value is the concise runtime sense approved from the fixed modern
// definition. The set is intentionally explicit: corpus frequency alone is
// never treated as a suitability decision.
export const APPROVED_MEANINGS = Object.freeze({
  剑: '宝剑；喻书法雄健', 芝: '灵芝、芝兰，喻美好高尚', 寒: '寒冬，清冷意象', 庚: '天干第七位；年龄',
  致: '给予；专心致志；精致', 繁: '兴盛、繁荣', 选: '选择、选贤任能', 巨: '盛大；卓有成就',
  履: '践行、履行', 藩: '屏障、保卫', 聚: '会合、凝聚', 绿: '绿色、生机',
  今: '当下、现在', 函: '包含、容纳', 竟: '完成；有志者事竟成', 驹: '少壮骏马，喻少年英俊',
  炬: '火炬；目光如炬', 粤: '广东的别称', 圻: '边际', 冶: '熔炼、铸造',
  瑚: '瑚琏，喻有才能', 彝: '常理、法理', 楫: '舟楫；聚集', 淦: '起伏的激浪',
  锟: '锟铻，宝剑', 崴: '山水弯曲处', 韫: '蕴藏、包藏', 铉: '古代鼎耳，喻重任',
  询: '询问、请教', 闰: '闰月、闰日', 沚: '水中的小块陆地', 翕: '和顺、聚合',
  獬: '獬豸，能辨曲直', 撙: '节制、谦逊', 猗: '赞美', 庇: '庇荫、保护',
  蒸: '蒸腾、蒸蒸日上', 湍: '急流', 蒿: '青蒿、香蒿', 兀: '高高突起',
  涑: '涑水，水名', 袤: '广袤', 甬: '花蓓蕾的样子；宁波别称', 骢: '青白杂毛的马',
  堰: '挡水的堤坝', 峪: '山谷', 汴: '汴水；开封别称', 郢: '古代楚国都城',
  黔: '贵州别称', 滇: '云南别称', 赣: '江西别称', 陇: '陇山；甘肃别称',
  濮: '濮水、濮阳', 楹: '堂前柱；楹联', 墀: '宫殿前的台阶', 瑁: '古代玉制礼器',
  逑: '聚合；匹配', 綦: '极、深', 均: '均匀、公平', 洋: '广大、盛大',
  菊: '菊花，秋季开花', 潇: '潇洒自然；水深而清', 寅: '恭敬', 懋: '勤奋努力；盛大美好',
  祚: '福，赐福', 旻: '天空', 休: '吉庆、美善、福禄', 琮: '古代玉制礼器',
  垣: '星空区域', 沂: '沂河，水名', 璜: '半璧形的玉', 寰: '广大的地域，寰宇',
  洙: '洙水，水名', 璠: '美玉', 律: '法则、规律', 瑗: '大孔的璧',
  拱: '环绕；拱手致敬', 矩: '法则、规矩', 璘: '玉的光彩', 昉: '明亮',
  祜: '福', 旸: '太阳升起；晴天', 巽: '八卦之一，代表风', 佶: '健壮',
  倬: '显著、盛大', 揆: '道理、准则', 琇: '像玉的石', 庠: '古代学校',
  晃: '明亮', 暹: '日升', 烜: '盛大、显著', 秩: '有条理、不混乱',
  焜: '光明', 沆: '露气', 邕: '和睦、和谐', 僖: '喜乐',
  聿: '古代称笔，用笔写文章', 湜: '水清见底', 蔷: '蔷薇花', 蘅: '蘅芜，香草',
  翥: '鸟向上飞', 玢: '玉的花纹', 荪: '香草', 敞: '宽敞、开阔',
  遴: '谨慎选择', 泌: '泉流轻快', 耐: '忍耐、耐久', 迥: '遥远、清楚',
  廓: '空阔、广阔', 勖: '勉励', 勐: '勇猛', 嵬: '高大',
  浑: '浑厚、质朴', 缓: '缓和、从容', 潞: '潞河，水名', 蕤: '草木花叶下垂的样子',
  嶷: '九嶷，山名', 澧: '澧水，水名', 溱: '古水名', 漳: '漳河，水名',
  璁: '明亮光洁', 忭: '高兴、喜欢', 堉: '肥沃的土壤', 喈: '声音和谐',
  竦: '恭敬、肃敬', 伉: '对等、相称；正直', 惺: '清醒', 篆: '篆书，古朴',
  惕: '警惕、小心谨慎', 栝: '桧树', 纂: '搜集材料编书',
  祗: '敬、恭敬', 暾: '日光明亮温暖', 霨: '云彩兴起',
  湉: '水面平静', 旰: '天色晚；盛大的样子', 遒: '雄健有力', 醴: '甜美的泉水',
  愫: '真实的心情、诚意', 勰: '协和，多用于人名', 庥: '庇荫、保护', 肄: '学习、练习',
  孳: '勤勉不懈', 侑: '相助', 侔: '相等、齐', 逖: '遥远',
  迢: '遥远、高远', 妥: '适当、稳妥', 焯: '明白透彻', 丕: '盛大',
  逵: '通向各方的道路', 阜: '土山；丰盛', 峙: '直立、耸立', 琚: '古人佩带的玉',
  邈: '遥远、高远', 骞: '高举、飞起', 锴: '好铁', 怿: '欢喜',
  瓒: '古代玉制礼器', 琏: '古代宗庙礼器', 濠: '濠水，水名', 洹: '洹水，水名',
  剡: '剡溪，水名', 婺: '婺水，水名', 沭: '沭河，水名', 涪: '涪江，水名',
  滁: '滁河，水名', 滏: '滏阳河，水名', 溆: '溆水，水名', 淄: '淄河，水名',
  苕: '凌霄花', 蘧: '芙蕖、荷花', 芾: '草木茂盛', 芩: '黄芩，草本植物',
  毖: '谨慎', 悫: '诚实、谨慎', 霁: '雨雪停止、天放晴', 闳: '宏大、宽广',
  赜: '深奥、玄妙', 诒: '赠与、给与', 峤: '高而尖的山', 塬: '黄土高原上的高地',
  颉: '向上飞；颉颃', 骧: '马昂首；高举', 鋆: '金子', 瑭: '一种玉',
  俣: '高大、魁伟', 氤: '氤氲，烟云弥漫', 湲: '水流声', 芭: '香草；芭蕉',
  篪: '古代竹制乐器', 黼: '古代礼服纹样', 黻: '古代礼服纹样', 笈: '书箱',
  篇: '完整的文章或诗词', 斑: '斑斓色彩', 珥: '日月两旁的光晕',
  鋈: '白色金属', 俅: '恭顺的样子',
});

const STYLE_RULES = [
  ['清雅', /清|洁|雅|玉|璧|光彩|香草|菊|蔷薇|荷花|竹|古朴/u],
  ['书卷', /勤奋|勉励|学习|学校|文章|诗|书|明白|法则|规律|规矩|准则|谨慎|恭敬|诚实|诚意/u],
  ['刚健', /健壮|勇猛|雄健|高大|盛大|飞起|向上飞|耸立|攀登/u],
  ['明朗', /光明|明亮|日升|太阳|晴天|放晴|光晕/u],
  ['灵动', /水|河|江|泉|风|云|日光|鸟|飞|花|草木|山/u],
  ['沉稳', /平静|稳妥|有条理|肥沃|浑厚|准则|诚实|谨慎|直立/u],
  ['温婉', /喜|和睦|和谐|温暖|美好|福|欢|花/u],
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function parseAncientNameCorpus(text) {
  const frequencies = new Map();
  let names = 0;
  let rejectedLength = 0;
  let rejectedSurname = 0;
  let rejectedGivenName = 0;
  for (const rawLine of text.replace(/^\uFEFF/u, '').split(/\r?\n/u)) {
    const fullName = rawLine.trim();
    if (!fullName || fullName.startsWith('By@') || /^\d{4}\.\d{2}\.\d{2}$/u.test(fullName)) continue;
    if (![2, 3].includes([...fullName].length)) {
      rejectedLength += 1;
      continue;
    }
    const surnameLength = TOP_SURNAMES.has(fullName.slice(0, 2)) ? 2 : 1;
    if (!TOP_SURNAMES.has(fullName.slice(0, surnameLength))) {
      rejectedSurname += 1;
      continue;
    }
    const givenName = fullName.slice(surnameLength);
    if (!/^[\u3400-\u9fff]{1,2}$/u.test(givenName)) {
      rejectedGivenName += 1;
      continue;
    }
    names += 1;
    for (const char of givenName) frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  }
  return {
    frequencies,
    counts: { names, uniqueGivenCharacters: frequencies.size, rejectedLength, rejectedSurname, rejectedGivenName },
  };
}

function normalizePinyin(value) {
  const decomposed = value.trim().normalize('NFD').toLowerCase();
  const marks = ['\u0304', '\u0301', '\u030c', '\u0300'];
  const markedTone = marks.findIndex((mark) => decomposed.includes(mark)) + 1;
  const numberedTone = /[1-5]$/u.test(decomposed) ? Number(decomposed.at(-1)) : 5;
  const tone = markedTone || numberedTone;
  const syllable = decomposed
    .replace(/u\u0308/gu, 'v')
    .replace(/[\u0304\u0301\u030c\u0300]/gu, '')
    .replace(/[1-5]$/u, '');
  return { syllable, tone, key: `${syllable}${tone}` };
}

export function parseUnihanMandarin(text) {
  const readings = new Map();
  for (const line of text.split(/\r?\n/u)) {
    if (!line.includes('\tkMandarin\t')) continue;
    const [codePoint, , value] = line.split('\t');
    readings.set(
      String.fromCodePoint(Number.parseInt(codePoint.slice(2), 16)),
      value.trim().split(/\s+/u),
    );
  }
  return readings;
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
  if (known < MIN_CORPUS_OCCURRENCES) return 'neutral';
  const maleShare = counts.male / known;
  return maleShare >= 0.7 ? 'male' : maleShare <= 0.3 ? 'female' : 'neutral';
}

export function evaluateThirdSourceCandidates({
  standardLibrary,
  recommendedCharacters,
  reviewQueue,
  previousAudit,
  kangxiCharacters,
  definitions,
  unihanReadings,
  modernCorpus,
  ancientCorpus,
}) {
  const existing = new Set(
    recommendedCharacters
      .filter((entry) => !entry.sources?.project?.includes(AUDIT_MARKER))
      .map((entry) => entry.char),
  );
  const queueByCharacter = new Map(reviewQueue.entries.map((entry) => [entry.char, entry]));
  const previousByCharacter = new Map(previousAudit.entries.map((entry) => [entry.char, entry]));
  const entries = [];

  for (const standard of standardLibrary.entries) {
    const char = standard.char;
    const modernOccurrences = modernCorpus.frequencies.get(char) ?? 0;
    const ancientOccurrences = ancientCorpus.frequencies.get(char) ?? 0;
    if (
      standard.level > 2 ||
      existing.has(char) ||
      (modernOccurrences < MIN_CORPUS_OCCURRENCES && ancientOccurrences < MIN_CORPUS_OCCURRENCES)
    ) continue;

    const ruleIds = [];
    const previous = previousByCharacter.get(char);
    if (
      queueByCharacter.has(char) &&
      (!previous || previous.ruleIds.length !== 1 || previous.ruleIds[0] !== 'neutral.score.below-approve-threshold')
    ) ruleIds.push('third-source.prior-hard-decision');

    const metadata = kangxiCharacters[char];
    const definition = definitions[char];
    if (!metadata?.wx || !metadata.py || !metadata.rad || !Number.isInteger(metadata.bs) || !definition) {
      ruleIds.push('third-source.metadata.incomplete');
    }

    const readings = unihanReadings.get(char) ?? [];
    if (readings.length !== 1) ruleIds.push('third-source.reading.not-single');
    else if (metadata?.py && normalizePinyin(readings[0]).key !== normalizePinyin(metadata.py).key) {
      ruleIds.push('third-source.reading.mismatch');
    }
    if (metadata?.py && ![1, 2, 3, 4].includes(normalizePinyin(metadata.py).tone)) {
      ruleIds.push('third-source.reading.no-lexical-tone');
    }

    const approvedMeaning = APPROVED_MEANINGS[char];
    if (!approvedMeaning) ruleIds.push('third-source.semantic.not-approved');
    const decision = ruleIds.length ? 'rejected' : 'approved';
    entries.push({
      char,
      decision,
      ruleIds: decision === 'approved' ? ['third-source.corpus-observed', 'third-source.semantic.approved'] : ruleIds,
      evidence: {
        standardIndex: standard.index,
        standardLevel: standard.level,
        modernOccurrences,
        ancientOccurrences,
        pinyin: metadata?.py ?? null,
        unihanReadings: readings,
        element: metadata?.wx ?? null,
        radical: metadata?.rad ?? null,
        strokes: metadata?.bs ?? null,
        traditional: metadata?.t ?? null,
        traditionalStrokes: metadata?.kx ?? null,
        sourceDefinition: definition ?? null,
      },
      review: {
        approvedMeaning: decision === 'approved' ? approvedMeaning : '',
        styleTags: decision === 'approved' ? styleTagsFor(approvedMeaning) : [],
        reviewedBy: REVIEWER,
        reviewedAt: REVIEWED_AT,
      },
    });
  }
  return entries;
}

export function prepareThirdSourceImport({ audit, standardLibrary, recommendedCharacters }) {
  const standardByCharacter = new Map(standardLibrary.entries.map((entry) => [entry.char, entry]));
  const generatedByCharacter = new Map(
    recommendedCharacters
      .filter((entry) => entry.sources?.project?.includes(AUDIT_MARKER))
      .map((entry) => [entry.char, entry]),
  );
  const retainedCharacters = recommendedCharacters.filter(
    (entry) => !entry.sources?.project?.includes(AUDIT_MARKER),
  );
  const existingByCharacter = new Map(retainedCharacters.map((entry) => [entry.char, entry]));
  const additions = [];
  const generated = [];
  let alreadyImported = 0;
  for (const entry of audit.entries.filter((item) => item.decision === 'approved')) {
    const standard = standardByCharacter.get(entry.char);
    if (!standard || standard.index !== entry.evidence.standardIndex || standard.level !== entry.evidence.standardLevel) {
      throw new Error(`字符“${entry.char}”的规范字证据已漂移`);
    }
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
    const existing = existingByCharacter.get(entry.char);
    if (existing) {
      throw new Error(`字符“${entry.char}”已存在且来源不一致`);
    }
    const previousGenerated = generatedByCharacter.get(entry.char);
    if (previousGenerated && JSON.stringify(previousGenerated) === JSON.stringify(candidate)) {
      alreadyImported += 1;
      generated.push(previousGenerated);
    } else {
      additions.push(candidate);
      generated.push(candidate);
    }
  }
  const approvedCharacters = new Set(generated.map((entry) => entry.char));
  const removed = [...generatedByCharacter.keys()].filter((char) => !approvedCharacters.has(char));
  return { additions, alreadyImported, removed, merged: [...retainedCharacters, ...generated] };
}

function countsFor(entries) {
  return entries.reduce((counts, entry) => ({ ...counts, [entry.decision]: counts[entry.decision] + 1 }), {
    total: entries.length, approved: 0, rejected: 0, pending: 0,
  });
}

function markdown(audit) {
  const lines = [
    '# 推荐字第三来源完整审计', '',
    `- 字典：\`${audit.sources.kangxi.project}@${audit.sources.kangxi.commit}\`（${audit.sources.kangxi.license}）`,
    `- 姓名证据：\`${audit.sources.names.project}@${audit.sources.names.commit}\`（${audit.sources.names.license}）`,
    `- 读音复核：Unicode Unihan ${audit.sources.unihan.version} \`kMandarin\``,
    `- 现代语料：${audit.corpus.modern.names.toLocaleString('en-US')} 个姓名；历史语料经前 200 姓氏与 2–3 字全名过滤后 ${audit.corpus.ancient.names.toLocaleString('en-US')} 个姓名`,
    `- 结果：批准 ${audit.counts.approved}、拒绝 ${audit.counts.rejected}、待审 ${audit.counts.pending}；推荐层由 ${audit.runtime.beforeEnabled.toLocaleString('en-US')} 增至 ${audit.runtime.afterEnabled.toLocaleString('en-US')}`,
    '',
    '> 准入边界：姓名语料出现只提供“观察到使用”的证据。只有列入固定正向/中性语义表、属于规范字一二级、字典元数据完整、且 Unihan 单一普通话读音与字典一致的字符才进入运行库；既有硬拒绝不覆盖。',
    '', '| 字 | 决定 | 现代次数 | 历史次数 | 规则 | 运行时释义 |', '|---|---|---:|---:|---|---|',
  ];
  for (const entry of audit.entries) {
    lines.push(`| ${entry.char} | ${entry.decision} | ${entry.evidence.modernOccurrences} | ${entry.evidence.ancientOccurrences} | ${entry.ruleIds.join('、')} | ${entry.review.approvedMeaning || '—'} |`);
  }
  lines.push('', `数量目标边界：原计划“约 2,500～4,000”是逐步扩充目标，不是放宽准入的配额。本轮固定来源穷尽后仍差 ${audit.runtime.remainingTo2500.toLocaleString('en-US')} 字，报告不把未获正向/中性语义批准的字符写成 pending，也不批量翻转硬拒绝。`, '');
  return lines.join('\n');
}

async function verifiedRead(filePath, expectedHash, label) {
  const value = await readFile(filePath);
  if (sha256(value) !== expectedHash) throw new Error(`${label} SHA-256 与固定快照不一致`);
  return value;
}

export async function main(args = process.argv.slice(2)) {
  const [charsPath, definitionsPath, kangxiLicensePath, modernPath, ancientPath, surnameWorkbookPath, namesLicensePath, unihanPath, flag] = args;
  if (!unihanPath) throw new Error('请依次提供 Kangxi chars/defs/LICENSE、现代/历史姓名语料、姓氏工作簿、姓名语料 LICENSE、Unihan_Readings.txt');
  const apply = flag === '--apply';
  const [charsBuffer, definitionsBuffer, , modernBuffer, ancientBuffer, , , unihanBuffer, standardText, recommendedText, reviewText, previousAuditText] = await Promise.all([
    verifiedRead(charsPath, SOURCES.kangxi.charsSha256, 'Kangxi chars'),
    verifiedRead(definitionsPath, SOURCES.kangxi.definitionsSha256, 'Kangxi definitions'),
    verifiedRead(kangxiLicensePath, SOURCES.kangxi.licenseSha256, 'Kangxi LICENSE'),
    verifiedRead(modernPath, SOURCES.names.modernSha256, '现代姓名语料'),
    verifiedRead(ancientPath, SOURCES.names.ancientSha256, '历史姓名语料'),
    verifiedRead(surnameWorkbookPath, SOURCES.names.surnameWorkbookSha256, '姓氏工作簿'),
    verifiedRead(namesLicensePath, SOURCES.names.licenseSha256, '姓名语料 LICENSE'),
    verifiedRead(unihanPath, SOURCES.unihan.readingsSha256, 'Unihan readings'),
    readFile('public/data/characters/standard.json', 'utf8'),
    readFile('public/data/characters/recommended-v2.json', 'utf8'),
    readFile('docs/recommended-character-review.json', 'utf8'),
    readFile('docs/recommended-character-neutral-balanced-audit-2026-09-10.json', 'utf8'),
  ]);
  if (TOP_SURNAMES.size !== 200) throw new Error(`固定高频姓氏数量异常：${TOP_SURNAMES.size}`);
  const modernCorpus = parseNameCorpus(modernBuffer.toString('utf8'));
  const ancientCorpus = parseAncientNameCorpus(ancientBuffer.toString('utf8'));
  if (modernCorpus.counts.names !== EXPECTED_MODERN_NAMES || modernCorpus.counts.uniqueGivenCharacters !== EXPECTED_MODERN_UNIQUE_CHARACTERS) throw new Error('现代姓名语料解析计数不一致');
  if (ancientCorpus.counts.names !== EXPECTED_ANCIENT_NAMES || ancientCorpus.counts.uniqueGivenCharacters !== EXPECTED_ANCIENT_UNIQUE_CHARACTERS) throw new Error(`历史姓名语料解析计数不一致：${JSON.stringify(ancientCorpus.counts)}`);
  const standardLibrary = JSON.parse(standardText);
  const recommendedCharacters = JSON.parse(recommendedText);
  const entries = evaluateThirdSourceCandidates({
    standardLibrary,
    recommendedCharacters,
    reviewQueue: JSON.parse(reviewText),
    previousAudit: JSON.parse(previousAuditText),
    kangxiCharacters: JSON.parse(gunzipSync(charsBuffer).toString('utf8')).chars,
    definitions: JSON.parse(gunzipSync(definitionsBuffer).toString('utf8')),
    unihanReadings: parseUnihanMandarin(unihanBuffer.toString('utf8')),
    modernCorpus,
    ancientCorpus,
  });
  const counts = countsFor(entries);
  const genderCounts = Object.fromEntries([...modernCorpus.genderCounts].filter(([char]) => entries.some((entry) => entry.char === char)));
  const beforeEnabled = recommendedCharacters.filter(
    (entry) => entry.naming.suitable && !entry.sources?.project?.includes(AUDIT_MARKER),
  ).length;
  const audit = {
    schemaVersion: 1,
    auditId: 'recommended-character-expansion-2026-09-12',
    sources: SOURCES,
    policy: { minimumCorpusOccurrences: MIN_CORPUS_OCCURRENCES, topSurnameRows: 200, historicalFullNameLengths: [2, 3], hardDecisionsNeverOverridden: true, unihanReadingMustBeSingleAndMatch: true, decisionsAreClosed: true },
    corpus: { modern: modernCorpus.counts, ancient: ancientCorpus.counts },
    counts,
    runtime: { beforeEnabled, afterEnabled: beforeEnabled + counts.approved, remainingTo2500: Math.max(0, 2500 - beforeEnabled - counts.approved) },
    genderCounts,
    entries,
  };
  const paths = { json: 'docs/recommended-character-third-source-audit-2026-09-12.json', markdown: 'docs/recommended-character-third-source-audit-2026-09-12.md', recommended: 'public/data/characters/recommended-v2.json' };
  await Promise.all([writeFile(paths.json, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'), writeFile(paths.markdown, `${markdown(audit)}\n`, 'utf8')]);
  let imported = { additions: [], alreadyImported: 0, removed: [], merged: recommendedCharacters };
  if (apply) {
    imported = prepareThirdSourceImport({ audit, standardLibrary, recommendedCharacters });
    if (imported.additions.length || imported.removed.length) await writeFile(paths.recommended, `${JSON.stringify(imported.merged, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({ counts, runtime: audit.runtime, apply, additions: imported.additions.length, alreadyImported: imported.alreadyImported, removed: imported.removed.length }));
  return { audit, imported };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
