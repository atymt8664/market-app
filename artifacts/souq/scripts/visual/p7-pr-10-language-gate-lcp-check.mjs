/**
 * P7-PR-10 — First-launch Language Gate LCP lab (mobile-throttled Playwright).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const base =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ??
  process.env.P7_PR10_BASE ??
  "http://127.0.0.1:4173";

const OUT = path.join(root, ".screenshots", "p7-pr-10-language-gate-lcp");
const TARGET_LCP_MS = 3000;
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
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

async function measureFirstLaunchLcp(page) {
  await applyMobileLabProfile(page);
  const response = await page.goto(`${base}/`, { waitUntil: "commit", timeout: 90_000 });
  assert(response?.ok(), "Home response must be OK");

  const initialHtml = await response.text();
  assert(initialHtml.includes('id="p7-language-gate-lcp"'), "Initial HTML contains static gate LCP h1");
  assert(initialHtml.includes('id="p7-language-gate-shell"'), "Initial HTML contains static gate shell");

  await page.waitForFunction(
    () => document.getElementById("p7-language-gate-shell")?.classList.contains("p7-lang-gate-visible"),
    { timeout: 5000 },
  );

  const metrics = await page.evaluate(async () => {
    const lcpEntries = [];
    await new Promise((resolve) => {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const el = entry.element;
          lcpEntries.push({
            startTime: entry.startTime,
            size: entry.size,
            id: el?.id || "",
            tag: el?.tagName || "",
            staticGate: !!el?.closest?.('[data-p7-language-gate="static"]'),
          });
        }
      });
      obs.observe({ type: "largest-contentful-paint", buffered: true });
      for (const entry of performance.getEntriesByType("largest-contentful-paint")) {
        const el = entry.element;
        lcpEntries.push({
          startTime: entry.startTime,
          size: entry.size,
          id: el?.id || "",
          tag: el?.tagName || "",
          staticGate: !!el?.closest?.('[data-p7-language-gate="static"]'),
        });
      }
      setTimeout(() => {
        obs.disconnect();
        resolve(undefined);
      }, 3500);
    });

    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((e) => e.name === "first-contentful-paint")?.startTime ?? null;
    const last = lcpEntries[lcpEntries.length - 1] ?? null;
    const staticVisible = document
      .getElementById("p7-language-gate-shell")
      ?.classList.contains("p7-lang-gate-visible");

    return {
      fcpMs: fcp,
      lcpMs: last?.startTime ?? null,
      lcpId: last?.id ?? "",
      lcpTag: last?.tag ?? "",
      lcpStaticGate: !!last?.staticGate,
      lcpEntries,
      staticGateVisible: staticVisible,
    };
  });

  return metrics;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices["Pixel 5"],
  locale: "ar",
});
await context.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const page = await context.newPage();
let metrics;
try {
  metrics = await measureFirstLaunchLcp(page);
} finally {
  await browser.close();
}

assert(metrics.staticGateVisible, "Static language gate visible before React boot");
assert(metrics.lcpStaticGate, "LCP must originate from static language gate shell (zero-React)");
assert(metrics.lcpMs != null, "LCP entry recorded");
assert(metrics.lcpMs <= TARGET_LCP_MS, `LCP ${Math.round(metrics.lcpMs)}ms exceeds ${TARGET_LCP_MS}ms target`);

const report = {
  generatedAt: new Date().toISOString(),
  base,
  labProfile: "playwright-mobile-throttled-pixel5",
  metrics: {
    fcpMs: metrics.fcpMs != null ? Math.round(metrics.fcpMs) : null,
    lcpMs: metrics.lcpMs != null ? Math.round(metrics.lcpMs) : null,
    lcpId: metrics.lcpId,
    lcpTag: metrics.lcpTag,
    performanceEstimate: metrics.lcpMs != null && metrics.lcpMs <= 2500 ? "90+" : metrics.lcpMs <= 3000 ? "85-90" : "<85",
  },
  pass: errors.length === 0,
  errors,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ ...report, lcpEntries: metrics.lcpEntries }, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
