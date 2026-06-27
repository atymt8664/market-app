/**
 * P-16 product placement verification — Create Ad picker on EZpad/Playwright.
 * Verifies Blueprint v3.1 canonical paths for high-hesitation products.
 */
import { chromium, devices } from "playwright";
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:5173";
const API = process.env.AUDIT_API_URL ?? "http://127.0.0.1:3001";
const OUT = path.join(process.env.TEMP ?? "/tmp", "pls-taxonomy-v3-product-picks");
mkdirSync(OUT, { recursive: true });

const creds = JSON.parse(readFileSync(path.join(__dirname, "..", ".p11-test-creds.json"), "utf8"));

try {
  execSync("adb reverse tcp:5173 tcp:5173", { stdio: "ignore" });
  execSync("adb reverse tcp:3001 tcp:3001", { stdio: "ignore" });
} catch {
  /* desktop-only run */
}

/** Blueprint P-16 Annex — expected single placement */
const PRODUCT_PICKS = [
  { product: "معدات مطعم (فرن صناعي)", main: "المنزل والحديقة", sub: "معدات مطاعم ومقاهي" },
  { product: "معدات مقهى (إسبريسو تجاري)", main: "المنزل والحديقة", sub: "معدات مطاعم ومقاهي" },
  { product: "ماكينة قهوة منزلية", main: "الإلكترونيات", sub: "أجهزة منزلية" },
  { product: "مطحنة قهوة يدوية", main: "المنزل والحديقة", sub: "أدوات مطبخ" },
  { product: "أراجيل/شيشة", main: "الترفيه والهوايات", sub: "أراجيل وشيشة ومستلزمات" },
  { product: "معسل", main: "الترفيه والهوايات", sub: "أراجيل وشيشة ومستلزمات" },
  { product: "فحم أراجيل", main: "الترفيه والهوايات", sub: "أراجيل وشيشة ومستلزمات" },
  { product: "معدات ورشة (مثقال)", main: "المنزل والحديقة", sub: "معدات ورش وحرف" },
  { product: "مانيكان محل", main: "المنزل والحديقة", sub: "معدات ورش وحرف" },
  { product: "طابعة", main: "الإلكترونيات", sub: "طابعات" },
  { product: "شاشة كمبيوتر", main: "الإلكترونيات", sub: "شاشات كمبيوتر" },
  { product: "تلفزيون", main: "الإلكترونيات", sub: "تلفزيونات" },
  { product: "راوتر", main: "الإلكترونيات", sub: "شبكات وراوترات" },
  { product: "Switch شبكة", main: "الإلكترونيات", sub: "شبكات وراوترات" },
  { product: "كرسي متحرك", main: "المنزل والحديقة", sub: "مستلزمات صحية وطبية منزلية" },
  { product: "جهاز ضغط", main: "المنزل والحديقة", sub: "مستلزمات صحية وطبية منزلية" },
  { product: "جهاز رياضة منزلي", main: "الترفيه والهوايات", sub: "رياضة ومعدات" },
  { product: "كاميرا DSLR", main: "الإلكترونيات", sub: "كاميرات" },
  { product: "حامل كاميرا", main: "الترفيه والهوايات", sub: "معدات تصوير وإكسسوارات" },
];

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

const apiCats = await fetchJson(`${API}/api/categories`);
const apiTree = [];
for (const c of apiCats.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
  const subs = await fetchJson(`${API}/api/categories/${c.id}/subcategories`);
  apiTree.push({ id: c.id, name: c.name, subs: subs.map((s) => ({ id: s.id, name: s.name })) });
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Galaxy Tab S4"], locale: "ar" });
await ctx.addInitScript(() => localStorage.setItem("app_locale", "ar"));
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
await page.locator('input[type="email"], input[name="email"]').first().fill(creds.email);
await page.locator('input[type="password"]').first().fill(creds.password);
await page.locator('button[type="submit"]').first().click();
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90000 });

const results = [];

async function pickCategory(mainName, subName) {
  await page.goto(`${BASE}/new`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /اختر التصنيف|Choose category|Kategorie/i }).click();
  await page.waitForTimeout(700);
  const mainBtn = page.getByRole("button", { name: mainName, exact: true });
  const mainVisible = await mainBtn.isVisible().catch(() => false);
  if (!mainVisible) return { mainVisible: false, subVisible: false, label: "" };
  await mainBtn.click();
  await page.waitForTimeout(700);
  const subBtn = page.getByRole("button", { name: subName, exact: true });
  const subVisible = await subBtn.isVisible().catch(() => false);
  if (!subVisible) return { mainVisible: true, subVisible: false, label: "" };
  await subBtn.click();
  await page.waitForTimeout(500);
  const label = (await page.locator("text=/←|→/").first().textContent().catch(() => "")) ?? "";
  return { mainVisible: true, subVisible: true, label: label.replace(/\s+/g, " ").trim() };
}

for (const p of PRODUCT_PICKS) {
  const catApi = apiTree.find((c) => c.name === p.main);
  const subApi = catApi?.subs.find((s) => s.name === p.sub);
  const ui = await pickCategory(p.main, p.sub);
  const apiOk = Boolean(catApi && subApi);
  const uiOk = ui.mainVisible && ui.subVisible && ui.label.includes(p.main) && ui.label.includes(p.sub);
  results.push({
    product: p.product,
    expected: `${p.main} → ${p.sub}`,
    apiCategoryId: catApi?.id ?? null,
    apiSubcategoryId: subApi?.id ?? null,
    apiOk,
    uiOk,
    pass: apiOk && uiOk,
  });
}

const legacyNames = [
  "محلات تجارية",
  "عطور وعناية",
  "كاميرات وتصوير",
  "صيانة",
  "دروس خصوصية",
  "كتب عربية",
];
const visibleLegacy = [];
for (const c of apiTree) {
  for (const s of c.subs) {
    if (legacyNames.includes(s.name)) visibleLegacy.push(`${c.name}::${s.name}`);
  }
}

const report = {
  apiCategories: apiTree.length,
  apiSubcategories: apiTree.reduce((n, c) => n + c.subs.length, 0),
  expectedSubcategories: 89,
  productPicks: results,
  productPicksPass: results.every((r) => r.pass),
  visibleLegacyInApi: visibleLegacy,
  legacyPass: visibleLegacy.length === 0,
  pass: results.every((r) => r.pass) && visibleLegacy.length === 0 && apiTree.reduce((n, c) => n + c.subs.length, 0) === 89,
};

writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
await browser.close();
