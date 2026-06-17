#!/usr/bin/env node
/** P7-PR-10 — vanilla language gate locale flows (ar / en / de). */
import { chromium } from "playwright";

const base =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://127.0.0.1:4173";

async function runLocaleFlow(page, label, rowMatch, expectedLocale) {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#p7-language-gate-shell.p7-lang-gate-visible", { timeout: 5000 });
  await page.locator(".p7-lang-gate-row").filter({ hasText: rowMatch }).click();
  await page.getByRole("button", { name: /متابعة|Continue|Weiter/i }).click();
  await page.waitForFunction(
    (loc) => localStorage.getItem("app_locale") === loc,
    expectedLocale,
    { timeout: 15000 },
  );
  await page.waitForSelector("#root main, section article", { timeout: 20000 });
  const stuck = await page.locator("#p7-language-gate-shell.p7-lang-gate-visible").count();
  return { label, pass: stuck === 0, locale: await page.evaluate(() => localStorage.getItem("app_locale")) };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const results = [];

for (const [label, match, locale] of [
  ["ar", "العربية", "ar"],
  ["en", "English", "en"],
  ["de", "Deutsch", "de"],
]) {
  await ctx.clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  results.push(await runLocaleFlow(page, label, match, locale));
}

await browser.close();
const pass = results.every((r) => r.pass);
console.log(JSON.stringify({ base, pass, results }, null, 2));
process.exit(pass ? 0 : 1);
