/**
 * CHAT PACKAGE FINAL — production browser verification (www.souq-arab.com).
 * Credentials via env: PROD_TEST_BUYER_EMAIL, PROD_TEST_BUYER_PASSWORD, PROD_TEST_SELLER_EMAIL, PROD_TEST_SELLER_PASSWORD
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const souqRequire = createRequire(path.join(__dirname, "../../../artifacts/souq/package.json"));
const { chromium, devices } = souqRequire("playwright");

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "chat-package-final-prod-verify");
const BASE = "https://www.souq-arab.com";
const API = "https://api.souq-arab.com";

const BUYER = {
  email: process.env.PROD_TEST_BUYER_EMAIL || "atymt8664@gmail.com",
  password: process.env.PROD_TEST_BUYER_PASSWORD || "",
};
const SELLER = {
  email: process.env.PROD_TEST_SELLER_EMAIL || "asasas1213212@gmail.com",
  password: process.env.PROD_TEST_SELLER_PASSWORD || "",
  name: "Abutym",
};

if (!BUYER.password || !SELLER.password) {
  console.log(JSON.stringify({ ok: false, reason: "missing_prod_test_passwords_env" }));
  process.exit(2);
}

const report = { timestamp: new Date().toISOString(), base: BASE, scenarios: {}, screenshots: {}, pass: false };

function set(id, pass, details = {}) {
  report.scenarios[id] = { pass, ...details };
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshots[name] = path.basename(file);
}

async function dismissGate(page) {
  const btn = page.getByRole("button", { name: /متابعة|Continue|Weiter/i });
  if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(400);
  }
}

async function apiLogin(ctx, email, password) {
  const res = await ctx.request.post(`${API}/api/auth/login`, {
    data: { email, password },
    headers: { "content-type": "application/json", origin: BASE },
  });
  if (!res.ok()) throw new Error(`login_failed_${res.status()}`);
  return res.json();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const buyerCtx = await browser.newContext({ ...devices["iPhone 14 Pro"], locale: "ar-SA" });
  await buyerCtx.addInitScript(() => {
    localStorage.setItem("app_locale", "ar");
    localStorage.setItem("souq.chatMenuTipSeen", "1");
  });

  const buyerData = await apiLogin(buyerCtx, BUYER.email, BUYER.password);
  set("login", true, { userId: buyerData.id });

  const sellerCtx = await browser.newContext({ ...devices["iPhone 14 Pro"], locale: "ar-SA" });
  await sellerCtx.addInitScript(() => {
    localStorage.setItem("app_locale", "ar");
    localStorage.setItem("souq.chatMenuTipSeen", "1");
  });
  await apiLogin(sellerCtx, SELLER.email, SELLER.password);

  const page = await buyerCtx.newPage();
  await page.goto(`${BASE}/messages`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissGate(page);
  await page.waitForTimeout(2500);
  set("messages_load", await page.locator("li button").first().isVisible({ timeout: 15_000 }).catch(() => false));

  const sellerRow = page.locator("li button").filter({ hasText: SELLER.name });
  const hasSeller = (await sellerRow.count()) >= 1;
  set("consolidation_inbox", hasSeller);

  if (hasSeller) {
    const row = sellerRow.first();
    await row.dispatchEvent("pointerdown");
    await page.waitForTimeout(650);
    await row.dispatchEvent("pointerup");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /حذف المحادثة|Delete conversation/i }).click();
    await page.waitForTimeout(400);
    const title = page.locator('[role="alertdialog"], [data-state="open"]').filter({ hasText: /حذف المحادثة/ });
    set("delete_dialog_title", await title.isVisible({ timeout: 3000 }).catch(() => false));

    const [deleteRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/delete-for-me") && r.request().method() === "POST", { timeout: 20_000 }),
      page.getByRole("button", { name: /^حذف$/ }).click(),
    ]);
    set("delete_api", deleteRes.status() === 200, { status: deleteRes.status() });
    await page.waitForTimeout(800);

    const undoBtn = page.getByRole("button", { name: /تراجع|Undo/i });
    const snackVisible = await undoBtn.isVisible({ timeout: 3000 }).catch(() => false);
    set("undo_snackbar_visible", snackVisible);
    const snackBox = snackVisible ? await undoBtn.evaluate((el) => {
      const card = el.closest('[dir="rtl"]');
      const rect = card?.getBoundingClientRect();
      const nav = document.querySelector("[data-bottom-nav-shell]");
      const navRect = nav?.getBoundingClientRect();
      return {
        snackBottom: rect?.bottom,
        navTop: navRect?.top,
        snackAboveNav: rect && navRect ? rect.bottom <= navRect.top + 4 : null,
      };
    }) : null;
    set("undo_snackbar_above_nav", snackBox?.snackAboveNav === true, snackBox || {});
    await shot(page, "delete-undo-snackbar");

    if (snackVisible) {
      const [restoreRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/restore-for-me") && r.request().method() === "POST", { timeout: 20_000 }),
        undoBtn.click(),
      ]);
      set("undo_restore", restoreRes.status() === 200, { status: restoreRes.status() });
      await page.waitForTimeout(1200);
      set("undo_restores_inbox", (await sellerRow.count()) >= 1);
      await shot(page, "after-undo-restore");

      // Delete again — wait expiry
      await row.dispatchEvent("pointerdown");
      await page.waitForTimeout(650);
      await row.dispatchEvent("pointerup");
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /حذف المحادثة|Delete conversation/i }).click();
      await page.waitForTimeout(400);
      await Promise.all([
        page.waitForResponse((r) => r.url().includes("/delete-for-me"), { timeout: 20_000 }),
        page.getByRole("button", { name: /^حذف$/ }).click(),
      ]);
      await page.waitForTimeout(5500);
      set("expiry_keeps_delete", (await sellerRow.count()) === 0);
      await shot(page, "after-expiry");

      // Auto-restore via seller message
      const convList = await buyerCtx.request.get(`${API}/api/conversations`, { headers: { origin: BASE } });
      const convs = await convList.json();
      const list = Array.isArray(convs) ? convs : convs.items || [];
      const conv = list.find((c) => c.sellerName?.includes(SELLER.name) || c.otherPartyName?.includes(SELLER.name));
      const convId = conv?.id;
      if (convId) {
        const sellerLogin = await apiLogin(sellerCtx, SELLER.email, SELLER.password);
        await sellerCtx.request.post(`${API}/api/conversations/${convId}/messages`, {
          data: { body: `auto-restore ${Date.now()}` },
          headers: { "content-type": "application/json", "x-csrf-token": sellerLogin.csrfToken, origin: BASE },
        });
        await page.goto(`${BASE}/messages`);
        await page.waitForTimeout(3000);
        set("auto_restore", (await sellerRow.count()) >= 1);
      } else {
        set("auto_restore", false, { reason: "conv_id_missing" });
      }
    }
  }

  // Regression smoke
  await page.goto(BASE);
  await dismissGate(page);
  set("home", await page.getByText(/العقارات|الإلكترونيات/i).first().isVisible({ timeout: 15_000 }).catch(() => false));
  await page.goto(`${BASE}/favorites`);
  set("favorites", await page.waitForLoadState("domcontentloaded").then(() => true).catch(() => false));
  await page.goto(`${BASE}/profile`);
  set("profile", await page.getByText(/حسابي|Profile/i).first().isVisible({ timeout: 10_000 }).catch(() => false));

  await buyerCtx.close();
  await sellerCtx.close();
} catch (e) {
  report.error = String(e?.message || e);
}

report.pass = Object.keys(report.scenarios).length > 0 && Object.values(report.scenarios).every((s) => s.pass);
await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.pass, scenarios: report.scenarios, screenshots: report.screenshots, error: report.error }, null, 2));
await browser.close();
process.exit(report.pass ? 0 : 1);
