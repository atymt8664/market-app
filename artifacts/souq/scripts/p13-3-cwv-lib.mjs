/**
 * P13-3-B — shared Core Web Vitals SLOs + Playwright mobile lab runner.
 * Lab uses mobile viewport + CDP throttling (Lighthouse-equivalent targets, no lighthouse npm dep).
 */
import { writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";

export { P13_ORIGIN, P13_API_ORIGIN } from "./sitemap-ads.mjs";

/** Google CWV "Good" thresholds (P13-3 charter). */
export const CWV_SLO = {
  LCP_MS: 2500,
  INP_MS: 200,
  CLS: 0.1,
};

export const LOCALE_STORAGE_KEY = "app_locale";

/** Mobile lab profile aligned with Lighthouse simulated mobile. */
const MOBILE = devices["Pixel 5"];

export function createAssert(errors) {
  return (cond, msg) => {
    if (!cond) errors.push(msg);
  };
}

export function evaluateCwvMetrics(metrics, routeLabel) {
  const errors = [];
  if (metrics.lcpMs == null || metrics.lcpMs > CWV_SLO.LCP_MS) {
    errors.push(
      `${routeLabel}: LCP ${metrics.lcpMs != null ? Math.round(metrics.lcpMs) : "?"}ms > ${CWV_SLO.LCP_MS}ms SLO`,
    );
  }
  if (metrics.cls == null || metrics.cls > CWV_SLO.CLS) {
    errors.push(`${routeLabel}: CLS ${metrics.cls ?? "?"} > ${CWV_SLO.CLS} SLO`);
  }
  if (metrics.inpMs != null && metrics.inpMs > CWV_SLO.INP_MS) {
    errors.push(
      `${routeLabel}: INP ${Math.round(metrics.inpMs)}ms > ${CWV_SLO.INP_MS}ms SLO`,
    );
  }
  return errors;
}

export async function resolveSampleAdId(apiOrigin, fetchFn = fetch) {
  const res = await fetchFn(`${apiOrigin}/ads?limit=1`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const ads = await res.json();
  return Array.isArray(ads) && ads[0]?.id != null ? String(ads[0].id) : null;
}

export async function seedReturningUserLocale(page, origin) {
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate((key) => {
    try {
      localStorage.setItem(key, "ar");
    } catch {
      /* ignore */
    }
  }, LOCALE_STORAGE_KEY);
}

async function applyMobileLabProfile(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  });
}

/**
 * Measure LCP + CLS in a mobile-throttled Playwright session.
 * INP is field-only in P13-3-B v1 lab (no synthetic interaction script).
 */
export async function measureRouteCwv(page, url) {
  await applyMobileLabProfile(page);
  await page.goto(url, { waitUntil: "load", timeout: 90_000 });

  return page.evaluate(async () => {
    const metrics = await new Promise((resolve) => {
      let lcpMs = null;
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          lcpMs = entry.startTime;
        }
      });
      obs.observe({ type: "largest-contentful-paint", buffered: true });

      const existing = performance.getEntriesByType("largest-contentful-paint");
      if (existing.length) {
        lcpMs = existing[existing.length - 1].startTime;
      }

      setTimeout(() => {
        obs.disconnect();
        let cls = 0;
        for (const entry of performance.getEntriesByType("layout-shift")) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
        resolve({ lcpMs, cls, inpMs: null });
      }, 3000);
    });
    return metrics;
  });
}

/**
 * @param {{ baseUrl: string, routes: Array<{ path: string, label: string }>, artifactPath?: string }} opts
 */
export async function runCwvLabMatrix({ baseUrl, routes, artifactPath }) {
  const errors = [];
  const assert = createAssert(errors);
  const reports = [];

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      ...MOBILE,
      locale: "ar",
      extraHTTPHeaders: { "Accept-Language": "ar" },
    });
    const seedPage = await context.newPage();
    await seedReturningUserLocale(seedPage, baseUrl);
    await seedPage.close();

    for (const route of routes) {
      const url = new URL(route.path, baseUrl).href;
      const page = await context.newPage();
      try {
        const metrics = await measureRouteCwv(page, url);
        reports.push({ route: route.label, path: route.path, url, metrics });
        errors.push(...evaluateCwvMetrics(metrics, route.label));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (artifactPath && reports.length) {
    writeFileSync(
      artifactPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          baseUrl,
          labProfile: "playwright-mobile-throttled",
          routes: reports,
        },
        null,
        2,
      ),
    );
  }

  return errors;
}
