/**
 * Metadata engine coverage audit — all 89 categories must map to a field group.
 */
import { chromium, devices } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_FIELD_GROUP_MAP,
  metadataCoverageStats,
  getCreateAdDynamicFields,
} from "../src/lib/product-metadata/engine.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:5173";
const API = process.env.AUDIT_API_URL ?? "http://127.0.0.1:3001";
const OUT = path.join(process.env.TEMP ?? "/tmp", "pls-taxonomy-metadata-audit");
mkdirSync(OUT, { recursive: true });

const creds = JSON.parse(readFileSync(path.join(__dirname, "..", ".p11-test-creds.json"), "utf8"));

async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

const stats = metadataCoverageStats();
const cats = await fetchJson(`${API}/api/categories`);
const coverage: Array<{
  main: string;
  sub: string;
  slug: string;
  key: string;
  group: string | null;
  fieldCount: number;
}> = [];

for (const c of cats.sort((a: { sortOrder?: number }, b: { sortOrder?: number }) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
  const subs = await fetchJson(`${API}/api/categories/${c.id}/subcategories`);
  for (const s of subs) {
    const key = `${c.slug}::${s.name}`;
    const group = CATEGORY_FIELD_GROUP_MAP[key] ?? null;
    const fields = getCreateAdDynamicFields(c.slug, s.name);
    coverage.push({
      main: c.name,
      sub: s.name,
      slug: c.slug,
      key,
      group,
      fieldCount: fields.length,
    });
  }
}

const unmapped = coverage.filter((c) => !c.group || c.fieldCount === 0);
const withRequired = coverage.filter((c) =>
  getCreateAdDynamicFields(c.slug, c.sub).some((f) => f.required),
);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Galaxy Tab S4"], locale: "ar" });
await ctx.addInitScript(() => localStorage.setItem("app_locale", "ar"));
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
await page.locator('input[type="email"], input[name="email"]').first().fill(creds.email);
await page.locator('input[type="password"]').first().fill(creds.password);
await page.locator('button[type="submit"]').first().click();
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90000 });

const uiSamples = [
  { main: "الإلكترونيات", sub: "هواتف ذكية", minFields: 4 },
  { main: "السيارات والدراجات", sub: "سيارات", minFields: 6 },
  { main: "المنزل والحديقة", sub: "معدات مطاعم ومقاهي", minFields: 2 },
  { main: "الترفيه والهوايات", sub: "أراجيل وشيشة ومستلزمات", minFields: 2 },
  { main: "العقارات", sub: "شقق للإيجار", minFields: 2 },
];

async function countFieldsUi(main: string, sub: string) {
  await page.goto(`${BASE}/new`, { waitUntil: "networkidle", timeout: 90000 });
  await page.getByRole("button", { name: /اختر التصنيف|Choose category/i }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: main, exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: sub, exact: true }).click();
  await page.waitForTimeout(900);
  const labels = await page.locator("label.text-zinc-400").allTextContents();
  return labels.length;
}

const uiResults = [];
for (const s of uiSamples) {
  const count = await countFieldsUi(s.main, s.sub);
  uiResults.push({ ...s, uiFieldCount: count, pass: count >= s.minFields });
}

const report = {
  engineStats: stats,
  apiSubcategories: coverage.length,
  mappedWithFields: coverage.filter((c) => c.fieldCount > 0).length,
  unmapped,
  withRequiredCount: withRequired.length,
  uiSamples: uiResults,
  pass:
    coverage.length === 89 &&
    unmapped.length === 0 &&
    uiResults.every((r) => r.pass),
};

writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
await browser.close();
