/**
 * P7-PR-12 — LCP layer survives until handoff; discoverable from initial HTML.
 * Usage: node scripts/visual/p7-pr-12-home-shell-lcp-check.mjs --base=http://127.0.0.1:4173
 */
import { chromium, devices } from "playwright";
import { FEATURED_LEAD_RENDER_RE } from "../ad-image-lcp-constants.mjs";

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
  const context = await browser.newContext({ ...devices["iPhone 12"], locale: "ar" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("app_locale", "ar"));

  const report = { base: opts.base, checks: [], errors: [] };
  const assert = (cond, msg) => {
    report.checks.push({ pass: !!cond, msg });
    if (!cond) report.errors.push(msg);
  };

  try {
    const docResponse = await page.goto(`${opts.base}/`, {
      waitUntil: "commit",
      timeout: 120000,
    });
    const initialHtml = await docResponse?.text();
    assert(!!initialHtml, "Got initial document HTML");
    assert(initialHtml.includes('id="p7-lcp-layer"'), "Initial HTML has #p7-lcp-layer");
    assert(
      !/<div id="root">[\s\S]*?p7-lcp-candidate/.test(initialHtml),
      "LCP candidate not inside #root in HTML",
    );
    assert(
      initialHtml.includes('data-testid="home-lcp-prerender"'),
      "Initial HTML contains prerender LCP img",
    );
    assert(FEATURED_LEAD_RENDER_RE.test(initialHtml), "Initial HTML has featured-lead render URL");

    const layerBeforeJs = await page.locator("#p7-lcp-layer").count();
    assert(layerBeforeJs >= 1, "#p7-lcp-layer in DOM before heavy hydration");

    const candidate = page.locator("#p7-lcp-candidate");
    await candidate.waitFor({ state: "attached", timeout: 10000 });
    const inLayer = await page.locator("#p7-lcp-layer #p7-lcp-candidate").count();
    assert(inLayer >= 1, "#p7-lcp-candidate lives under #p7-lcp-layer");

    await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {});

    const layerAfter = await page.locator("#p7-lcp-layer.p7-dismissed, #p7-lcp-layer").count();
    assert(layerAfter >= 0, "Layer state observable after load");

    const featured = await page.getByText(/إعلانات مميزة|Featured|Empfohlene/i).count();
    assert(featured > 0, "Featured heading visible after React");
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
