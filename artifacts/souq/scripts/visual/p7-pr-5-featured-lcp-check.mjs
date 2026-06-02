/**
 * P7-PR-5 — Featured lead must use Supabase hero render URL (LCP path).
 * Usage: node scripts/visual/p7-pr-5-featured-lcp-check.mjs --base=http://127.0.0.1:4173
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
  const imageRequests = [];
  page.on("request", (req) => {
    if (req.resourceType() === "image") imageRequests.push(req.url());
  });
  await page.addInitScript(() => localStorage.setItem("app_locale", "ar"));

  const report = { base: opts.base, checks: [], errors: [] };
  const assert = (cond, msg) => {
    report.checks.push({ pass: !!cond, msg });
    if (!cond) report.errors.push(msg);
  };

  try {
    await page.goto(`${opts.base}/`, { waitUntil: "networkidle", timeout: 120000 });
    const leadImg = page.locator("a[href^='/ad/'] img").first();
    await leadImg.waitFor({ state: "visible", timeout: 60000 });
    const src = await leadImg.getAttribute("src");
    assert(!!src, "Featured lead img has src");
    assert(FEATURED_LEAD_RENDER_RE.test(src ?? ""), "Featured lead src uses featured-lead render transform");
    assert((await leadImg.getAttribute("fetchpriority")) === "high", "Featured lead fetchPriority=high");
    assert((await leadImg.getAttribute("loading")) === "eager", "Featured lead loading=eager");

    const leadFetch = imageRequests.some((u) => FEATURED_LEAD_RENDER_RE.test(u));
    assert(leadFetch, "Network requested featured-lead render image");

    const natural = await leadImg.evaluate((el) => ({
      complete: el.complete,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
    }));
    assert(natural.complete && natural.naturalWidth > 0, "Featured lead image decoded successfully");
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
