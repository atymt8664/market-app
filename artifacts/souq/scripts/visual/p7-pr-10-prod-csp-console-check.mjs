#!/usr/bin/env node
/** P7-PR-10 — Production CSP + console check for language gate inline scripts. */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "https://www.souq-arab.com";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".screenshots", "p7-pr-10-prod-verify");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

const nav = await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
const csp = (await nav?.allHeaders())?.["content-security-policy"] ?? "";
const gateVisible = await page.locator("#p7-language-gate-shell.p7-lang-gate-visible").isVisible();
const hasLcpH1 = await page.locator("#p7-language-gate-lcp").count();
const cspErrors = consoleErrors.filter((e) => /content security policy|csp/i.test(e));
const gateErrors = consoleErrors.filter((e) => /language-gate|p7-locale|p7-language/i.test(e));

await page.getByRole("button", { name: /متابعة|Continue|Weiter/i }).click();
await page.waitForFunction(() => !!localStorage.getItem("app_locale"), { timeout: 20000 });
await page.waitForSelector("section article", { timeout: 20000 });

const report = {
  base,
  cspHasGateHash: csp.includes("sha256-Y2Lu9GsxoccEh8hpa5AOsZwX152j8AGftx2xUY4RTqI="),
  gateVisibleOnLoad: gateVisible,
  hasLcpH1: hasLcpH1 > 0,
  cspConsoleErrors: cspErrors,
  gateConsoleErrors: gateErrors,
  pass: gateVisible && hasLcpH1 > 0 && cspErrors.length === 0 && gateErrors.length === 0,
};

writeFileSync(path.join(OUT, "csp-console-report.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
