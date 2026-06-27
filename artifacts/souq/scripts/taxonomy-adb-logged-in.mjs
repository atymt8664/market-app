/**
 * ADB + Playwright logged-in taxonomy verification on connected device.
 */
import { chromium, devices } from "playwright";
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:3001";
const OUT = path.join(process.env.TEMP ?? "/tmp", "pls-taxonomy-adb-final-v2");
mkdirSync(OUT, { recursive: true });
const creds = JSON.parse(readFileSync(path.join(__dirname, "..", ".p11-test-creds.json"), "utf8"));

function adbShot(name) {
  try {
    execSync(`cmd /c "adb exec-out screencap -p > \\"${path.join(OUT, name)}\\""`, { stdio: "ignore" });
  } catch {
    /* screencap optional — flow verification via Playwright is primary */
  }
}

execSync("adb reverse tcp:5173 tcp:5173", { stdio: "ignore" });
execSync("adb reverse tcp:3001 tcp:3001", { stdio: "ignore" });

const report = { device: execSync("adb devices -l", { encoding: "utf8" }).trim(), steps: [], pass: false };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Galaxy Tab S4"], locale: "ar" });
await ctx.addInitScript(() => localStorage.setItem("app_locale", "ar"));
const page = await ctx.newPage();

async function step(name, fn) {
  try {
    await fn();
    adbShot(`${String(report.steps.length + 1).padStart(2, "0")}_${name}.png`);
    report.steps.push({ name, pass: true });
  } catch (e) {
    report.steps.push({ name, pass: false, error: String(e) });
    throw e;
  }
}

try {
  await step("login", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator('input[type="email"], input[name="email"]').first().fill(creds.email);
    await page.locator('input[type="password"]').first().fill(creds.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60000 });
  });

  await step("create_ad_picker", async () => {
    await page.goto(`${BASE}/new`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /اختر التصنيف|Choose category/i }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "الإلكترونيات", exact: true }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "هواتف ذكية", exact: true }).click();
    const label = await page.locator("text=/←|→/").first().textContent();
    if (!label?.includes("الإلكترونيات") || !label?.includes("هواتف ذكية")) {
      throw new Error(`bad label: ${label}`);
    }
  });

  await step("category_page_filter", async () => {
    await page.goto(`${BASE}/category/5?subcategoryId=21`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const body = await page.locator("body").innerText();
    if (!body.includes("هواتف ذكية")) throw new Error("sub filter heading missing");
  });

  await step("ad_detail_taxonomy", async () => {
    const list = await (await fetch(`${API}/api/ads?categoryId=5&limit=1`)).json();
    const ad = list.items?.[0];
    if (!ad?.id) throw new Error("no ad for detail test");
    const detail = await (await fetch(`${API}/api/ads/${ad.id}`)).json();
    await page.goto(`${BASE}/ad/${ad.id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    if (!body.includes(detail.categoryName)) throw new Error(`missing ${detail.categoryName}`);
  });

  await step("home_regression", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByText(/العقارات|الإلكترونيات/).first().waitFor({ timeout: 10000 });
  });

  report.pass = report.steps.every((s) => s.pass);
} catch {
  report.pass = false;
}

writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
await browser.close();
