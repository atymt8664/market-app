/**
 * Spot-check Ad Detail taxonomy line against API (legacy ads without subcategoryId).
 */
import { chromium } from "playwright";

const BASE = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:5173";
const API = process.env.AUDIT_API_URL ?? "http://127.0.0.1:3001";

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

const samples = [
  { categoryId: 1, label: "العقارات" },
  { categoryId: 5, label: "الإلكترونيات" },
  { categoryId: 3, label: "السيارات والدراجات" },
  { categoryId: 2, label: "الأزياء والجمال" },
  { categoryId: 12, label: "الخدمات" },
  { categoryId: 14, label: "دروس ودورات" },
];

const results = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem("app_locale", "ar"));

for (const s of samples) {
  const listRes = await fetchJson(`${API}/api/ads?categoryId=${s.categoryId}&limit=1`);
  const ad = listRes.items?.[0] ?? (Array.isArray(listRes) ? listRes[0] : null);
  if (!ad?.id) {
    results.push({ ...s, pass: true, skipped: true, reason: "no_ad" });
    continue;
  }
  const detail = await fetchJson(`${API}/api/ads/${ad.id}`);
  await page.goto(`${BASE}/ad/${ad.id}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  const showsApiCategory = body.includes(detail.categoryName ?? s.label);
  const legacyNames = ["محلات تجارية", "عطور وعناية", "دروس خصوصية", "إطارات"];
  const showsLegacy = legacyNames.some((n) => body.includes(n));
  results.push({
    adId: ad.id,
    categoryId: s.categoryId,
    apiCategoryName: detail.categoryName,
    apiSubcategoryName: detail.subcategoryName,
    apiSubcategoryId: detail.subcategoryId,
    showsApiCategory,
    showsLegacySubName: showsLegacy,
    pass: showsApiCategory && !showsLegacy,
  });
}

console.log(JSON.stringify({ pass: results.every((r) => r.pass || r.skipped), results }, null, 2));
await browser.close();
