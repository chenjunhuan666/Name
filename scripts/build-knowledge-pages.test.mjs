import { describe, expect, it } from 'vitest';

import {
  KNOWLEDGE_PAGES,
  createKnowledgeHtml,
  createSitemap,
} from './build-knowledge-pages.mjs';

describe('Phase 7 静态知识页', () => {
  it('固定生成七个有独立 SEO 元数据的知识主题', () => {
    expect(KNOWLEDGE_PAGES.map(({ slug }) => slug)).toEqual([
      'tiangan',
      'dizhi',
      'wuxing',
      'bazi',
      'hidden-stems',
      'solar-terms',
      'naming',
    ]);
    for (const page of KNOWLEDGE_PAGES) {
      const html = createKnowledgeHtml(page);
      expect(html).toContain(`<title>${page.title}`);
      expect(html).toContain(`rel="canonical" href="https://chenjunhuan666.github.io/Name/knowledge/${page.slug}/"`);
      expect(html).toContain('<main');
      expect(html).toContain('<h1>');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('/Name/knowledge/');
    }
  });

  it('sitemap 只发布真实静态路径并保持 GitHub Pages 基路径', () => {
    const sitemap = createSitemap();
    expect(sitemap).toContain('<loc>https://chenjunhuan666.github.io/Name/</loc>');
    expect(sitemap).toContain('<loc>https://chenjunhuan666.github.io/Name/knowledge/solar-terms/</loc>');
    expect(sitemap.match(/<url>/gu)).toHaveLength(10);
  });
});
