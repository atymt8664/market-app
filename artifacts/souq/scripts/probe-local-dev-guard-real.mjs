import { chromium } from "playwright";

const FRONTEND = process.env.LOCAL_DEV_GUARD_FRONTEND ?? "http://127.0.0.1:5173";
const scenario = process.argv[2] ?? "probe";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => localStorage.setItem("app_locale", "ar"));
const page = await context.newPage();
await page.goto(`${FRONTEND}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(4500);

const bannerCount = await page.locator('[data-testid="local-dev-api-guard"]').count();
const bannerText =
  bannerCount > 0
    ? await page.locator('[data-testid="local-dev-api-guard"]').innerText()
    : "";

const fetchStatus = async (path) => {
  try {
    const r = await page.evaluate(async (p) => {
      const res = await fetch(p, { cache: "no-store" });
      return res.status;
    }, path);
    return r;
  } catch {
    return 0;
  }
};

const adLinks = await page.locator('a[href*="/ad/"]').count();

const result = {
  scenario,
  bannerVisible: bannerCount > 0,
  bannerText: bannerText.slice(0, 160),
  adLinks,
  healthStatus: await fetchStatus("/api/healthz"),
  featuredStatus: await fetchStatus("/api/ads/featured"),
  recommendedStatus: await fetchStatus("/api/ads/recommended"),
};

await browser.close();
console.log(JSON.stringify(result, null, 2));
