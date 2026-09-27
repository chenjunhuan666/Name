import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const REPORT_MODE = process.argv.includes('--report');
const expectedKnowledgePaths = [
  'knowledge/index.html',
  'knowledge/tiangan/index.html',
  'knowledge/dizhi/index.html',
  'knowledge/wuxing/index.html',
  'knowledge/bazi/index.html',
  'knowledge/hidden-stems/index.html',
  'knowledge/solar-terms/index.html',
  'knowledge/naming/index.html',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function auditHtml(relativePath, { spaShell = false } = {}) {
  const content = await readFile(path.join(DIST, relativePath), 'utf8');
  assert(/<html[^>]+lang="zh-CN"/u.test(content), `${relativePath} 缺少 zh-CN`);
  assert(/<title>[^<]+<\/title>/u.test(content), `${relativePath} 缺少 title`);
  assert(/<meta[^>]+name="description"/u.test(content), `${relativePath} 缺少 description`);
  if (spaShell) {
    assert(content.includes('<div id="root"></div>'), `${relativePath} 缺少 React root`);
    assert(/<noscript>[^<]+<\/noscript>/u.test(content), `${relativePath} 缺少 noscript 说明`);
  } else {
    assert(/<main(?:\s|>)/u.test(content), `${relativePath} 缺少 main`);
    assert((content.match(/<h1(?:\s|>)/gu) ?? []).length === 1, `${relativePath} 必须恰有一个 h1`);
  }
  assert(/rel="canonical"/u.test(content), `${relativePath} 缺少 canonical`);
  const blankTargets = content.match(/<a[^>]+target="_blank"[^>]*>/gu) ?? [];
  assert(blankTargets.every((tag) => /rel="[^"]*noreferrer/u.test(tag)), `${relativePath} 新窗口链接缺少 noreferrer`);
  const ids = [...content.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]);
  assert(new Set(ids).size === ids.length, `${relativePath} 存在重复 id`);
  return { path: relativePath, sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

async function main() {
  const files = [];
  for (const relativePath of ['index.html', 'about.html', ...expectedKnowledgePaths]) {
    files.push(await auditHtml(relativePath, { spaShell: relativePath === 'index.html' }));
  }
  const appIndex = await readFile(path.join(DIST, 'index.html'), 'utf8');
  assert(appIndex.includes('/Name/assets/'), '应用入口资源未使用 /Name/ 基路径');
  const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
  for (const relativePath of expectedKnowledgePaths) {
    const urlPath = relativePath.replace(/index\.html$/u, '');
    assert(sitemap.includes(`https://chenjunhuan666.github.io/Name/${urlPath}`), `sitemap 缺少 ${urlPath}`);
  }
  const assets = await readdir(path.join(DIST, 'assets'));
  assert(assets.some((name) => name.endsWith('.js')), '构建产物缺少 JavaScript');
  assert(assets.some((name) => name.endsWith('.css')), '构建产物缺少 CSS');

  const report = {
    schemaVersion: 1,
    phase: 'Phase 7',
    status: 'passed',
    basePath: '/Name/',
    auditedHtmlFiles: files,
    sitemapUrls: (sitemap.match(/<url>/gu) ?? []).length,
    checks: [
      'language', 'title', 'description', 'canonical', 'single-h1', 'main-landmark',
      'duplicate-id', 'safe-new-window-links', 'github-pages-base-path', 'sitemap', 'built-assets'
    ],
    boundary: '静态审计不替代真实浏览器键盘路径、颜色对比度或屏幕阅读器人工测试。'
  };
  if (REPORT_MODE) {
    await writeFile(path.join(ROOT, 'docs/releases/phase7-static-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(`Phase 7 static audit passed: ${files.length} HTML files, ${report.sitemapUrls} sitemap URLs.`);
}

await main();
