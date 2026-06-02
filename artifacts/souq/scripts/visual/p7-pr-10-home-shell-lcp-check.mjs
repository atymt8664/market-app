/**
 * P7-PR-10 — LCP img must exist in initial HTML before JS (response body), then hydrate.
 * Usage: node scripts/visual/p7-pr-10-home-shell-lcp-check.mjs --base=http://127.0.0.1:4173
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
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    const initialHtml = await docResponse?.text();
    assert(!!initialHtml, "Got initial document HTML");
    assert(
      initialHtml.includes('data-testid="home-lcp-prerender"'),
      "Initial HTML contains prerender LCP img (before React)",
    );
    assert(FEATURED_LEAD_RENDER_RE.test(initialHtml), "Initial HTML contains featured-lead render URL in body or preload");
    assert(
      initialHtml.includes('id="p7-lcp-hero-preload"'),
      "Initial HTML contains LCP preload link in head",
    );

    assert(
      initialHtml.includes('id="p7-lcp-candidate"'),
      "Initial HTML exposes #p7-lcp-candidate for early parser discovery",
    );
    assert(initialHtml.includes('fetchpriority="high"'), "Initial HTML sets fetchpriority=high on LCP img");
    assert(initialHtml.includes('loading="eager"'), "Initial HTML sets loading=eager on LCP img");
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
