import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
const W = 600;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: 960 }, locale: "ar-SA" });
const page = await ctx.newPage();

for (const [name, url, sel] of [
  ["ad_hero", "/ad/344", '[data-ad-detail-shell="hero"]'],
  ["ad_specs", "/ad/344", '[data-testid="ad-device-info-section"]'],
  ["create_card", "/create-ad", "form section > div.rounded-2xl"],
]) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const box = await loc.boundingBox().catch(() => null);
  const margin = box ? Math.round((W - box.width) / 2) : null;
  const visible = await loc.isVisible().catch(() => false);
  console.log(`${name}: width=${Math.round(box?.width ?? 0)} margin=${margin}px visible=${visible}`);
}

await browser.close();
