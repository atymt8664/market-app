#!/usr/bin/env node
/**
 * P17-8 Package 3 — full commerce loop browser visual test.
 * Prereq: vite :5173, api :3001 (rebuilt with pkg3 routes).
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SHOT = join(root, ".screenshots", "p17-8-pkg3");
const BASE = (process.env.E2E_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const PW = "P17Pkg3Browser99!z";

const apiRequire = createRequire(join(__dirname, "..", "..", "api-server", "package.json"));
const dotenv = apiRequire("dotenv");
const pg = apiRequire("pg");
const bcrypt = apiRequire("bcryptjs");

dotenv.config({ path: join(__dirname, "..", "..", "api-server", ".env") });
dotenv.config({ path: join(__dirname, "..", "..", "api-server", ".env.local"), override: true });

const report = { ok: true, steps: {}, viewports: {} };

function grabCookie(res, jar) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function dismissGate(page) {
  const btn = page.getByRole("button", { name: /متابعة|Continue|Weiter/i });
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function loginCtx(ctx, email) {
  const res = await ctx.request.post(`${BASE}/api/auth/login`, {
    data: { email, password: PW },
    headers: { "content-type": "application/json" },
  });
  if (!res.ok()) throw new Error(`login failed ${email}`);
  return res.json();
}

async function setupOrder(pool, ts, suffix) {
  const hash = await bcrypt.hash(PW, 10);
  const sellerEmail = `p17-br-seller-${suffix}-${ts}@example.invalid`;
  const buyerEmail = `p17-br-buyer-${suffix}-${ts}@example.invalid`;
  const categoryId = (await pool.query(`select id from categories where is_hidden = false limit 1`)).rows[0]?.id;
  const sellerId = (
    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified) values ($1,$2,'S','+491','Berlin',true) returning id`,
      [sellerEmail, hash],
    )
  ).rows[0].id;
  const buyerId = (
    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified) values ($1,$2,'B','+492','Munich',true) returning id`,
      [buyerEmail, hash],
    )
  ).rows[0].id;
  const adId = (
    await pool.query(
      `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
       values ($1,'Pkg3 Browser Ad','d','Berlin',$2,'S','+490','approved','[]'::jsonb,75,'fixed') returning id`,
      [sellerId, categoryId],
    )
  ).rows[0].id;

  const buyerLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: buyerEmail, password: PW }),
  });
  const buyerJson = await buyerLogin.json();
  const buyerSid = buyerLogin.headers.getSetCookie?.().map((c) => c.split(";")[0]).find((c) => c.startsWith("souq.sid=")) ?? "";

  const createRes = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: buyerSid,
      "x-csrf-token": buyerJson.csrfToken,
    },
    body: JSON.stringify({
      adId,
      fulfillmentMode: "shipping",
      currency: "EUR",
      shippingAmount: "5.00",
      buyerAddress: {
        city: "Munich",
        countryCode: "DE",
        postalCode: "80331",
        line1: "Browser Test St 1",
        line2: "Apt 2",
        recipientName: "Buyer",
        phone: "+491700000051",
      },
    }),
  });
  const createJson = await createRes.json();
  const orderNumber = createJson.order?.orderNumber;
  if (!orderNumber) throw new Error(`order create failed for ${suffix}`);

  const sellerLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: sellerEmail, password: PW }),
  });
  const sellerJson = await sellerLogin.json();
  const sellerSid =
    sellerLogin.headers.getSetCookie?.().map((c) => c.split(";")[0]).find((c) => c.startsWith("souq.sid=")) ?? "";
  const enc = encodeURIComponent(orderNumber);

  async function sellerPost(path, body = {}) {
    await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sellerSid,
        "x-csrf-token": sellerJson.csrfToken,
      },
      body: JSON.stringify(body),
    });
  }

  await sellerPost(`/api/orders/${enc}/accept`);
  await sellerPost(`/api/orders/${enc}/start-preparing`);
  await sellerPost(`/api/orders/${enc}/mark-shipped`, { carrierLabel: "DHL", trackingNumber: `BR-${suffix}-${ts}` });

  const ordRow = await pool.query(`select id from orders where order_number = $1`, [orderNumber]);
  return { orderNumber, orderId: ordRow.rows[0]?.id, sellerEmail, buyerEmail };
}

async function runViewport(name, device, pool, ts) {
  const { orderNumber, orderId, sellerEmail, buyerEmail } = await setupOrder(pool, ts, name);
  const vpReport = { orderNumber, orderId };
  const browser = await chromium.launch({ headless: true });
  const sellerCtx = await browser.newContext({ ...device, locale: "ar-SA" });
  const buyerCtx = await browser.newContext({ ...device, locale: "ar-SA" });
  await sellerCtx.addInitScript(() => {
    localStorage.setItem("app_locale", "ar");
    localStorage.setItem("theme", "dark");
  });
  await buyerCtx.addInitScript(() => {
    localStorage.setItem("app_locale", "ar");
    localStorage.setItem("theme", "dark");
  });
  await loginCtx(sellerCtx, sellerEmail);
  await loginCtx(buyerCtx, buyerEmail);

  const sellerPage = await sellerCtx.newPage();
  const buyerPage = await buyerCtx.newPage();

  const sellerPath = `/seller-orders/${encodeURIComponent(orderNumber)}`;
  const buyerPath = `/orders/${encodeURIComponent(orderNumber)}`;

  // Seller: in transit
  await sellerPage.goto(`${BASE}${sellerPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissGate(sellerPage);
  await sellerPage.waitForSelector('[data-testid="p17-order-detail-seller-mark-in-transit"]', { timeout: 30000 });
  await sellerPage.getByTestId("p17-order-detail-seller-mark-in-transit").click();
  await sellerPage.waitForTimeout(2000);
  await sellerPage.screenshot({ path: join(SHOT, `${name}-seller-in-transit.png`) });
  vpReport.sellerInTransit = (await sellerPage.locator("body").innerText()).includes("في الطريق");

  // Seller: delivered
  await sellerPage.getByTestId("p17-order-detail-seller-mark-delivered").click();
  await sellerPage.waitForTimeout(2000);
  await sellerPage.screenshot({ path: join(SHOT, `${name}-seller-delivered.png`) });
  vpReport.sellerDelivered = (await sellerPage.locator("body").innerText()).includes("بانتظار تأكيد");

  // Buyer: confirm + tracking
  await buyerPage.goto(`${BASE}${buyerPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissGate(buyerPage);
  await buyerPage.waitForSelector('[data-testid="p17-order-detail-confirm-receipt"]', { timeout: 30000 });
  const trackText = await buyerPage.locator('[data-testid="p17-tracking-last-updated"]').innerText();
  vpReport.noUndefined = !trackText.includes("undefined");
  await buyerPage.screenshot({ path: join(SHOT, `${name}-buyer-delivered-before-confirm.png`) });

  const scroll = await buyerPage.evaluate(() => {
    const el = document.querySelector('[data-app-shell-scroll="1"]');
    if (!el) return { hasOwner: false };
    const before = el.scrollTop;
    el.scrollTop = el.scrollHeight;
    return {
      hasOwner: true,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollMoved: el.scrollTop > before || el.scrollHeight <= el.clientHeight + 8,
      bottomNav: Boolean(document.querySelector('[data-bottom-nav-shell]')),
    };
  });
  vpReport.scrollDetails = scroll;
  vpReport.scrollOk =
    scroll.hasOwner &&
    (scroll.scrollMoved || scroll.scrollHeight <= scroll.clientHeight + 8) &&
    scroll.bottomNav;

  await buyerPage.getByTestId("p17-order-detail-confirm-receipt").click();
  await buyerPage.waitForTimeout(2500);
  await buyerPage.screenshot({ path: join(SHOT, `${name}-buyer-completed.png`), fullPage: true });
  vpReport.buyerCompleted =
    (await buyerPage.locator("body").innerText()).includes("اكتمل الطلب") ||
    (await buyerPage.getByTestId("p17-order-detail-buyer-completed").count()) >= 1;

  await browser.close();
  report.viewports[name] = vpReport;
  if (orderId) report.cleanupIds = [...(report.cleanupIds ?? []), orderId];
  const pass =
    vpReport.sellerInTransit === true &&
    vpReport.sellerDelivered === true &&
    vpReport.noUndefined === true &&
    vpReport.buyerCompleted === true &&
    vpReport.scrollOk === true;
  if (!pass) report.ok = false;
  console.log(`${pass ? "PASS" : "FAIL"} viewport/${name}`, JSON.stringify(vpReport));
}

async function main() {
  mkdirSync(SHOT, { recursive: true });
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  const ts = Date.now();
  report.cleanupIds = [];

  try {
    await runViewport("iphone-14", devices["iPhone 14 Pro"], pool, ts);
    await runViewport("pixel-5", devices["Pixel 5"], pool, ts);
    await runViewport("desktop", { viewport: { width: 1280, height: 800 } }, pool, ts);
  } finally {
    for (const id of report.cleanupIds ?? []) {
      await pool.query("delete from orders where id = $1", [id]).catch(() => {});
    }
    await pool.end();
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
