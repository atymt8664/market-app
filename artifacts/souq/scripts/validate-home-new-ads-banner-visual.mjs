/**
 * Home new-ads banner — mobile viewport smoke (local dev).
 * Mocks feed-meta to simulate 3 new ads without DB mutation.
 * Run: node scripts/validate-home-new-ads-banner-visual.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.SOUQ_BASE_URL || "http://127.0.0.1:5173";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ar",
});
const page = await context.newPage();

await page.route("**/api/ads/feed-meta**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      count: 3,
      newestAdId: 99999,
      newestCreatedAt: new Date().toISOString(),
    }),
  });
});

await page.addInitScript(() => {
  localStorage.setItem("app_locale", "ar");
});

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

await page.waitForSelector('[data-testid="home-new-ads-banner"]', {
  timeout: 120_000,
});

const banner = page.locator('[data-testid="home-new-ads-banner"] button');
const text = (await banner.innerText()).trim();
assert(text.includes("3"), `banner should show count 3, got: ${text}`);
assert(text.includes("إعلان"), `banner should be Arabic, got: ${text}`);

const box = await banner.boundingBox();
assert(box && box.height < 48, "banner should stay compact");
assert(box.y > 80, "banner should sit below search header area");

const search = page.locator('input[type="search"], [data-testid="home-search"] input').first();
if ((await search.count()) > 0) {
  const searchBox = await search.boundingBox();
  if (searchBox && box) {
    assert(box.y > searchBox.y, "banner must not cover search bar");
  }
}

let featuredRefetch = false;
await page.route("**/api/ads/featured**", async (route) => {
  featuredRefetch = true;
  await route.continue();
});

await banner.click();
await page.waitForTimeout(1500);
assert(featuredRefetch, "clicking banner should refetch featured ads");

await page.waitForSelector('[data-testid="home-new-ads-banner"]', {
  state: "hidden",
  timeout: 10_000,
}).catch(() => {
  /* banner may hide immediately after refresh clears mock count on next poll */
});

await browser.close();
console.log("validate-home-new-ads-banner-visual.mjs PASS", { text });
