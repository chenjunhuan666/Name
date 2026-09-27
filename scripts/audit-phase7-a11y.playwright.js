async (page) => {
  const axePath = 'node_modules/axe-core/axe.min.js';
  const routes = [
    {
      id: 'home',
      url: 'http://127.0.0.1:4173/Name/#/',
      heading: '从一纸生辰， 寻一个有根的名字',
    },
    {
      id: 'names',
      url: 'http://127.0.0.1:4173/Name/#/names',
      heading: '从候选好字，组合可解释姓名',
    },
    {
      id: 'knowledge',
      url: 'http://127.0.0.1:4173/Name/knowledge/',
      heading: '传统文化知识',
    },
  ];
  const reports = [];

  for (const route of routes) {
    await page.goto(route.url, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: route.heading }).waitFor();
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => {
      const audit = await globalThis.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      });

      return {
        passes: audit.passes.length,
        incomplete: audit.incomplete.map((item) => ({
          id: item.id,
          impact: item.impact,
          help: item.help,
          nodes: item.nodes.map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        })),
        violations: audit.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        })),
      };
    });

    reports.push({ ...route, ...result });
  }

  return {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    engine: 'axe-core 4.13.0',
    browser: page.context().browser()
      ? await page.context().browser().version()
      : 'unknown',
    rules: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    violationCount: reports.reduce(
      (total, report) => total + report.violations.length,
      0,
    ),
    reports,
  };
}
