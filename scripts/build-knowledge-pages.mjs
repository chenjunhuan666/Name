import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_MODE = process.argv.includes('--check');
const ORIGIN = 'https://chenjunhuan666.github.io';
const BASE_PATH = '/Name/';

export const KNOWLEDGE_PAGES = [
  {
    slug: 'tiangan',
    title: '十天干基础',
    description: '了解甲乙丙丁戊己庚辛壬癸的阴阳、五行与本项目中的结构化使用边界。',
    lead: '天干是干支纪时和八字结构的基础符号。本项目只使用可追溯的五行、阴阳与生克关系，不从单个天干推断现实命运。',
    sections: [['十天干', '甲乙属木，丙丁属火，戊己属土，庚辛属金，壬癸属水；每组前者为阳、后者为阴。'], ['工程边界', '天干关系用于展示结构证据和规则来源，不直接映射性格、事业、婚姻、健康或吉凶。']]
  },
  {
    slug: 'dizhi',
    title: '十二地支基础',
    description: '了解十二地支、藏干及合冲会刑害破在本项目中的结构化表达。',
    lead: '地支既参与纪时，也承载藏干信息。关系模块记录组合是否出现，但不自动裁决合化或吉凶。',
    sections: [['十二地支', '子丑寅卯辰巳午未申酉戌亥依次对应十二时辰与固定藏干表。'], ['关系说明', '三合、三会和三刑需要完整成员；项目去除反向重复，并为每条关系保留 ruleId。']]
  },
  {
    slug: 'wuxing',
    title: '五行与起名方向',
    description: '说明木火土金水的结构关系，以及为什么五行缺失不等于姓名必须补入。',
    lead: '本项目将五行作为结构化比较维度，而不是现实预测工具。旺衰证据、调候方向和姓名匹配分属于工程模型。',
    sections: [['五行关系', '木、火、土、金、水之间存在生克关系；同一字符的五行资料可能因字书或流派不同而存在差异。'], ['起名边界', '姓名评分比较候选与当前方向的匹配程度，不把五行缺失直接解释成必须补某一行。']]
  },
  {
    slug: 'bazi',
    title: '八字结构如何阅读',
    description: '介绍年、月、日、时四柱以及日主、月令、通根、透干和生扶克泄耗证据。',
    lead: '八字由年、月、日、时四柱组成。项目先展示输入和计算口径，再给出可追溯的结构证据。',
    sections: [['四柱与日主', '日柱天干作为日主；月令、藏干、透干、通根与生扶克泄耗共同形成五档强弱结果。'], ['口径差异', '节气交接、23 时换日、真太阳时和流派差异需要人工核对，不能隐藏在单一分数后。']]
  },
  {
    slug: 'hidden-stems',
    title: '地支藏干',
    description: '说明主气、中气、余气及藏干如何进入结构分析和十神展示。',
    lead: '每个地支可包含一个或多个藏干。本项目明确区分主气、中气、余气，并保留每项证据。',
    sections: [['主中余气', '藏干不是把地支简单替换成一个天干；多项藏干按固定表逐项展示。'], ['十神映射', '十神以日干为基准映射每项藏干，仅用于传统结构解释，不参与姓名加减分。']]
  },
  {
    slug: 'solar-terms',
    title: '节气与月令边界',
    description: '说明二十四节气、月令切换、UTC+8 与午夜换日的计算口径。',
    lead: '节气是太阳到达固定黄经位置的时刻。项目采用中国标准时间，并在交节边界提示核对。',
    sections: [['交节时刻', '年柱与月柱可能在立春或节令时刻切换，因此边界测试需要精确到分钟或秒。'], ['独立参考', 'Phase 7 使用香港天文台公开对照表核对日期与节气分钟，同时把依赖回归与独立来源验证明确分开。']]
  },
  {
    slug: 'naming',
    title: '可解释姓名推荐',
    description: '了解规范汉字、字义组合、音律、谐音、典籍出处与综合推荐分。',
    lead: '姓名推荐使用本地确定性规则，在规范字和受控审校结果上比较音形义、文化出处与当前偏好。',
    sections: [['综合推荐分', '分数用于同一组条件下比较候选，不是吉凶分或命运分。普通话谐音检查也不覆盖全部方言与现实语境。'], ['典籍出处', 'A 级为原文连续，B 级为同句同序，C 级为人工登记意象；D 级只证明单字出现，不能宣称整个名字出自某书。']]
  }
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function pageLinks() {
  return KNOWLEDGE_PAGES.map(({ slug, title }) => `<li><a href="${BASE_PATH}knowledge/${slug}/">${escapeHtml(title)}</a></li>`).join('');
}

function shell({ title, description, canonicalPath, body, structuredData }) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}｜传统文化宝宝起名</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow">
<link rel="canonical" href="${ORIGIN}${canonicalPath}"><link rel="icon" href="${BASE_PATH}favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(structuredData)}</script>
<style>body{margin:0;background:#f7f2e8;color:#30271e;font:16px/1.75 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:#7b3f22}a:focus-visible{outline:3px solid #1967d2;outline-offset:3px}.wrap{width:min(860px,calc(100% - 32px));margin:auto}.site{padding:20px 0;border-bottom:1px solid #d8ccba}.site a{font-weight:700;text-decoration:none}main{padding:48px 0}h1{font-size:clamp(2rem,7vw,3.7rem);line-height:1.15}h2{margin-top:2rem}.lead{font-size:1.15rem}.card{background:#fffdf8;border:1px solid #ded3c2;border-radius:16px;padding:20px;margin:18px 0}footer{border-top:1px solid #d8ccba;padding:28px 0 50px}nav ul{display:flex;flex-wrap:wrap;gap:8px 18px;padding-left:20px}</style></head>
<body><header class="site"><div class="wrap"><a href="${BASE_PATH}">传统文化宝宝起名</a></div></header>${body}<footer><div class="wrap"><nav aria-label="知识主题"><strong>继续阅读</strong><ul>${pageLinks()}</ul></nav><p><a href="${BASE_PATH}about.html">方法、数据与隐私说明</a></p></div></footer></body></html>\n`;
}

export function createKnowledgeHtml(page) {
  const canonicalPath = `${BASE_PATH}knowledge/${page.slug}/`;
  const body = `<main class="wrap"><p><a href="${BASE_PATH}knowledge/">知识首页</a></p><h1>${escapeHtml(page.title)}</h1><p class="lead">${escapeHtml(page.lead)}</p>${page.sections.map(([heading, text]) => `<section class="card"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join('')}<section aria-labelledby="boundary"><h2 id="boundary">使用边界</h2><p>内容用于解释本项目的确定性计算口径，不构成现实命运判断，也不替代历书、字典、登记机关或专业意见。</p></section></main>`;
  return shell({
    title: page.title,
    description: page.description,
    canonicalPath,
    body,
    structuredData: { '@context': 'https://schema.org', '@type': 'Article', headline: page.title, description: page.description, inLanguage: 'zh-CN', url: `${ORIGIN}${canonicalPath}` }
  });
}

export function createKnowledgeIndexHtml() {
  const body = `<main class="wrap"><h1>传统文化知识</h1><p class="lead">用可核对的结构和清晰边界理解天干地支、五行、八字、节气与姓名推荐。</p><nav aria-label="全部知识主题"><ul>${pageLinks()}</ul></nav></main>`;
  return shell({
    title: '传统文化知识',
    description: '传统文化宝宝起名项目的天干、地支、五行、八字、藏干、节气和姓名知识索引。',
    canonicalPath: `${BASE_PATH}knowledge/`,
    body,
    structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: '传统文化知识', inLanguage: 'zh-CN', url: `${ORIGIN}${BASE_PATH}knowledge/` }
  });
}

export function createSitemap() {
  const paths = ['', 'about.html', 'knowledge/', ...KNOWLEDGE_PAGES.map(({ slug }) => `knowledge/${slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((item) => `  <url><loc>${ORIGIN}${BASE_PATH}${item}</loc></url>`).join('\n')}\n</urlset>\n`;
}

async function writeOrCheck(relativePath, content) {
  const absolute = path.join(ROOT, relativePath);
  if (CHECK_MODE) {
    const current = await readFile(absolute, 'utf8').catch(() => '');
    if (current !== content) throw new Error(`静态知识页产物漂移：${relativePath}`);
    return;
  }
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
}

async function main() {
  await writeOrCheck('public/knowledge/index.html', createKnowledgeIndexHtml());
  for (const page of KNOWLEDGE_PAGES) {
    await writeOrCheck(`public/knowledge/${page.slug}/index.html`, createKnowledgeHtml(page));
  }
  await writeOrCheck('public/sitemap.xml', createSitemap());
  console.log(`Knowledge pages ${CHECK_MODE ? 'check' : 'build'} passed: ${KNOWLEDGE_PAGES.length} topics.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
