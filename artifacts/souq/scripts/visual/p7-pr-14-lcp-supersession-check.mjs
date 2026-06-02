/**
 * P7-PR-14 — final LCP must stay on #p7-lcp-candidate (no React supersession).
 * Usage: node scripts/visual/p7-pr-14-lcp-supersession-check.mjs --base=https://www.souq-arab.com
 */
import { chromium, devices } from "playwright";

function parseArgs(argv) {
  const opts = { base: "http://127.0.0.1:4173" };
  for (const arg of argv) {
    if (arg.startsWith("--base=")) opts.base = arg.slice(7).replace(/\/$/, "");
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["Pixel 5"], locale: "ar-SA" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("app_locale", "ar");
    } catch {
      /* ignore */
    }
    window.__p714 = { lcps: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const el = e.element;
        window.__p714.lcps.push({
          t: Math.round(e.startTime),
          id: el?.id ?? "",
          sz: Math.round(e.size),
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  const report = { base: opts.base, checks: [], errors: [] };
  const assert = (cond, msg) => {
    report.checks.push({ pass: !!cond, msg });
    if (!cond) report.errors.push(msg);
  };

  try {
    await page.goto(`${opts.base}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(5000);

    const data = await page.evaluate(() => ({
      lcps: window.__p714?.lcps ?? [],
      stable: document.documentElement.classList.contains("p7-lcp-stable"),
      finalLcp:
        performance.getEntriesByType("largest-contentful-paint").at(-1)?.startTime ?? null,
    }));

    assert(data.lcps.length >= 1, "At least one LCP entry recorded");
    const shellEntry = data.lcps.find((e) => e.id === "p7-lcp-candidate");
    assert(!!shellEntry, "Shell #p7-lcp-candidate registered as LCP");
    const last = data.lcps[data.lcps.length - 1];
    assert(last?.id === "p7-lcp-candidate", `Final LCP id is shell (${last?.id || "none"})`);
    const reactSupersession = data.lcps.filter((e) => e.id !== "p7-lcp-candidate" && e.sz > 20000);
    assert(reactSupersession.length === 0, "No large React IMG superseded shell LCP");
    assert(data.stable, "document has p7-lcp-stable after loader");
    if (data.finalLcp != null && shellEntry) {
      assert(
        Math.round(data.finalLcp) <= shellEntry.t + 50,
        `Performance final LCP ~${Math.round(data.finalLcp)}ms matches shell ~${shellEntry.t}ms`,
      );
    }

    await page.getByText(/إعلانات مميزة|Featured/i).first().waitFor({ timeout: 15000 });
    assert(true, "Featured section visible after handoff");
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
  }

  await browser.close();
  report.pass = report.errors.length === 0;
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
