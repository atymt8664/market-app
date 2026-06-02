/**
 * P9-B — Home stability visual smoke (STAGING / local preview).
 * Usage: node scripts/visual/p9-b-home-stability-smoke.mjs --base=http://127.0.0.1:4173
 *
 * Requires: build + preview server running. Not run in default CI.
 */
import { chromium, devices } from "playwright";

function parseArgs(argv) {
  const opts = { base: "http://127.0.0.1:4173" };
  for (const arg of argv) {
    if (arg.startsWith("--base=")) opts.base = arg.slice(7).replace(/\/$/, "");
  }
  return opts;
}

async function collectAdHrefs(page, containerSelector) {
  return page.$$eval(`${containerSelector} a[href^="/ad/"]`, (links) =>
    links.map((a) => a.getAttribute("href")).filter(Boolean),
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 12"], locale: "ar" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("app_locale", "ar"));

  const report = { base: opts.base, checks: [], errors: [] };
  const check = (cond, msg) => {
    report.checks.push({ pass: !!cond, msg });
    if (!cond) report.errors.push(msg);
  };

  try {
    // V1 — Home initial HTML shell structure
    const homeDoc = await page.goto(`${opts.base}/`, { waitUntil: "commit", timeout: 120000 });
    const initialHtml = await homeDoc?.text();
    check(!!initialHtml, "V1: Got initial document HTML for /");
    check(initialHtml?.includes('id="p7-lcp-layer"'), "V1: #p7-lcp-layer in initial HTML");
    check(
      !/<div id="root">[\s\S]*?p7-lcp-candidate/.test(initialHtml ?? ""),
      "V1: LCP candidate not inside #root",
    );

    await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {});

    // V2 — Featured heading after React
    const featuredHeading = await page.getByText(/إعلانات مميزة|Featured|Empfohlene/i).count();
    check(featuredHeading > 0, "V2: Featured section heading visible");

    // V5 — Reload: shell should not block UI
    await page.reload({ waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const layerCount = await page.locator("#p7-lcp-layer:not(.p7-dismissed)").count();
    const featuredAfterReload = await page.getByText(/إعلانات مميزة|Featured|Empfohlene/i).count();
    check(layerCount === 0 || featuredAfterReload > 0, "V5: No stuck shell blocking after reload");

    // V6 — Featured/Recommended dedupe (when cards exist)
    const featuredLinks = await collectAdHrefs(page, "body");
    const recommendedHeading = page.getByText(/موصى|Recommended|Empfohlen/i);
    if ((await recommendedHeading.count()) > 0) {
      await recommendedHeading.first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(800);
    }
    const allAdLinks = await page.$$eval('a[href^="/ad/"]', (links) =>
      links.map((a) => a.getAttribute("href")).filter(Boolean),
    );
    const featuredSet = new Set(
      allAdLinks.slice(0, Math.min(allAdLinks.length, 8)),
    );
    const duplicates = allAdLinks.filter(
      (href, idx) => allAdLinks.indexOf(href) !== idx,
    );
    check(duplicates.length === 0, "V6: No duplicate /ad/ hrefs in DOM (dedupe integrity)");
    if (featuredSet.size > 0 && allAdLinks.length > featuredSet.size) {
      const overlap = [...featuredSet].filter((h) =>
        allAdLinks.slice(featuredSet.size).includes(h),
      );
      check(overlap.length === 0, "V6: Featured IDs not repeated in Recommended section");
    }

    // V3 — Admin: no Home LCP candidate
    await page.goto(`${opts.base}/admin`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const adminCandidate = await page.locator("#p7-lcp-candidate").count();
    check(adminCandidate === 0, "V3: No #p7-lcp-candidate on /admin");
    const adminFeaturedStrip = await page.getByText(/إعلانات مميزة/i).count();
    check(adminFeaturedStrip === 0, "V3: No Home featured heading on /admin");

    // V4 — Categories: no stuck shell
    await page.goto(`${opts.base}/categories`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const catShell = await page.locator("#p7-lcp-layer #p7-lcp-candidate").count();
    check(catShell === 0, "V4: No shell LCP img on /categories");
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
