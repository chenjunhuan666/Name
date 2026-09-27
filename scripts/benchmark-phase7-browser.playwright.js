async (page) => {
  const baseUrl = 'http://127.0.0.1:4173/Name/';
  const samplesPerScenario = 10;
  const cpuThrottleRate = 4;
  const context = page.context();
  const browser = context.browser();
  const cdp = await context.newCDPSession(page);
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: cpuThrottleRate,
  });

  const percentile = (values, fraction) => {
    if (!values.length) return null;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.ceil(sorted.length * fraction) - 1];
  };

  const summarize = (values) => ({
    samples: values.length,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    minMs: values.length ? Math.min(...values) : null,
    maxMs: values.length ? Math.max(...values) : null,
  });

  const prepareNamingState = async () => {
    await page.goto(`${baseUrl}#/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /已知八字录入/ }).click();
    await page.getByRole('textbox', { name: '姓氏' }).fill('陈');
    await page.getByRole('combobox', { name: '年柱' }).selectOption('甲子');
    await page.getByRole('combobox', { name: '月柱' }).selectOption('丙寅');
    await page.getByRole('combobox', { name: '日柱' }).selectOption('戊辰');
    await page.getByRole('combobox', { name: '时柱' }).selectOption('庚午');
    await page.getByRole('button', { name: '生成八字并查看分析' }).click();
    await page.getByRole('heading', { name: '看见结构，而非只看缺失' }).waitFor();
  };

  const pageLoadSamples = async (cacheMode) => {
    const results = [];
    let failures = 0;

    await cdp.send('Network.setCacheDisabled', {
      cacheDisabled: cacheMode === 'cold',
    });

    for (let index = 0; index < samplesPerScenario; index += 1) {
      try {
        if (cacheMode === 'cold') {
          await cdp.send('Network.clearBrowserCache');
        }
        const startedAt = Date.now();
        await page.goto(`${baseUrl}?phase7=${cacheMode}-${index}#/names`, {
          waitUntil: 'domcontentloaded',
        });
        await page.getByText(/\d+ \/ 2160 字/).waitFor({ timeout: 30000 });
        const readyMs = Date.now() - startedAt;
        const browserMetrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource');
          const navigation = performance.getEntriesByType('navigation')[0];
          const paints = performance.getEntriesByType('paint');
          const resourceEnd = (patterns) =>
            Math.max(
              0,
              ...resources
                .filter((entry) =>
                  patterns.some((pattern) => entry.name.includes(pattern)),
                )
                .map((entry) => entry.responseEnd),
            );

          return {
            domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
            loadEventMs: navigation?.loadEventEnd ?? null,
            firstContentfulPaintMs:
              paints.find((entry) => entry.name === 'first-contentful-paint')
                ?.startTime ?? null,
            coreLibraryResponseEndMs: resourceEnd([
              'recommended-v2.json',
              'pronunciations.json',
            ]),
            classicLibraryResponseEndMs: resourceEnd(['/data/classics/']),
          };
        });
        results.push({ readyMs, ...browserMetrics });
      } catch {
        failures += 1;
      }
    }

    return { cacheMode, failures, samples: results };
  };

  const recommendationReadySamples = async () => {
    const values = [];
    let failures = 0;
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });

    for (let index = 0; index < samplesPerScenario; index += 1) {
      try {
        await page.evaluate(() => {
          window.location.hash = '#/analysis';
        });
        await page.getByRole('heading', { name: '看见结构，而非只看缺失' }).waitFor();
        const startedAt = Date.now();
        await page.evaluate(() => {
          window.location.hash = '#/names';
        });
        await page.getByRole('heading', { name: '为陈姓宝宝精选' }).waitFor({
          timeout: 30000,
        });
        await page.getByText(/已生成并保留 \d+ 个候选名/).waitFor({
          timeout: 30000,
        });
        values.push(Date.now() - startedAt);
      } catch {
        failures += 1;
      }
    }

    return { failures, ...summarize(values), valuesMs: values };
  };

  await prepareNamingState();
  const cold = await pageLoadSamples('cold');
  const hot = await pageLoadSamples('hot');
  const recommendationReady = await recommendationReadySamples();

  const metricSummary = (samples, key) =>
    summarize(
      samples
        .map((sample) => sample[key])
        .filter((value) => typeof value === 'number'),
    );

  return {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    environment: {
      browser: browser ? await browser.version() : 'unknown',
      userAgent: await page.evaluate(() => navigator.userAgent),
      cpuThrottleRate,
      origin: baseUrl,
      server: 'vite preview',
      viewport: page.viewportSize(),
    },
    contract: {
      samplesPerScenario,
      coldCacheClearedBeforeEveryRun: true,
      hotCacheRetainedAcrossRuns: true,
      scope:
        'Local production preview; route-ready includes JSON transfer/cache lookup, parse, render and visible candidate generation.',
    },
    cold: {
      failures: cold.failures,
      routeReady: metricSummary(cold.samples, 'readyMs'),
      firstContentfulPaint: metricSummary(
        cold.samples,
        'firstContentfulPaintMs',
      ),
      coreLibraryResponseEnd: metricSummary(
        cold.samples,
        'coreLibraryResponseEndMs',
      ),
      classicLibraryResponseEnd: metricSummary(
        cold.samples,
        'classicLibraryResponseEndMs',
      ),
      samples: cold.samples,
    },
    hot: {
      failures: hot.failures,
      routeReady: metricSummary(hot.samples, 'readyMs'),
      firstContentfulPaint: metricSummary(
        hot.samples,
        'firstContentfulPaintMs',
      ),
      coreLibraryResponseEnd: metricSummary(
        hot.samples,
        'coreLibraryResponseEndMs',
      ),
      classicLibraryResponseEnd: metricSummary(
        hot.samples,
        'classicLibraryResponseEndMs',
      ),
      samples: hot.samples,
    },
    recommendationReady,
    errors: {
      console: consoleErrors,
      page: pageErrors,
      count: consoleErrors.length + pageErrors.length,
    },
  };
}
