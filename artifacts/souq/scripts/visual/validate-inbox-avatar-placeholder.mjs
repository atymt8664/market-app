/**
 * P17 — Inbox avatar placeholder vs profile ring (local vite).
 * Run: cd artifacts/souq && node scripts/visual/validate-inbox-avatar-placeholder.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", ".screenshots", "p17-inbox-avatar-placeholder");
fs.mkdirSync(OUT, { recursive: true });

const apiRequire = createRequire(path.join(__dirname, "..", "..", "..", "api-server", "package.json"));
const dotenv = apiRequire("dotenv");
const pg = apiRequire("pg");
const bcrypt = apiRequire("bcryptjs");

dotenv.config({ path: path.join(__dirname, "..", "..", "..", "api-server", ".env") });
dotenv.config({
  path: path.join(__dirname, "..", "..", "..", "api-server", ".env.local"),
  override: true,
});

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const BASE = (process.env.E2E_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const PW = "InboxAvatarPh99!x";

const report = {
  timestamp: new Date().toISOString(),
  pass: false,
  checks: {},
  screenshots: {},
};

async function dismissGate(page) {
  const btn = page.getByRole("button", { name: /متابعة|Continue|Weiter/i });
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function login(page, email, password) {
  const res = await page.context().request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
    headers: { "content-type": "application/json" },
  });
  if (!res.ok()) throw new Error(`login failed ${res.status()}`);
}

function hasLimeRingShadow(boxShadow) {
  const s = boxShadow || "";
  return s.includes("182") && s.includes("227") && s.includes("86");
}

async function main() {
  if (!DATABASE_URL) {
    console.log(JSON.stringify({ pass: false, reason: "DATABASE_URL missing" }, null, 2));
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const cleanup = { convIds: [], adIds: [], userIds: [] };

  try {
    const health = await fetch(`${BASE}/`).catch(() => null);
    if (!health?.ok) {
      report.checks.devServer = { pass: false, detail: `vite not reachable at ${BASE}` };
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const ts = Date.now();
    const hash = await bcrypt.hash(PW, 10);
    const sellerEmail = `inbox-ph-seller-${ts}@example.invalid`;
    const buyerEmail = `inbox-ph-buyer-${ts}@example.invalid`;
    const sellerName = "بائع بدون صورة";

    const sellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [sellerEmail, hash, sellerName, "+491700000050", "Berlin"],
      )
    ).rows[0].id;
    const buyerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [buyerEmail, hash, "مشتري صندوق", "+491700000051", "Munich"],
      )
    ).rows[0].id;
    cleanup.userIds.push(sellerId, buyerId);

    const categoryId = (
      await pool.query(`select id from categories where is_hidden = false limit 1`)
    ).rows[0]?.id;
    const adId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Avatar Ph Ad','D','Berlin',$2,'S','+491700000052','approved','[]'::jsonb,50,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    cleanup.adIds.push(adId);

    const convId = (
      await pool.query(
        `insert into conversations (ad_id, buyer_id, seller_id, last_message_at, last_message_preview)
         values ($1,$2,$3,now(),'مرحبا') returning id`,
        [adId, buyerId, sellerId],
      )
    ).rows[0].id;
    cleanup.convIds.push(convId);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ...devices["Pixel 5"], locale: "ar-SA" });
    await context.addInitScript(() => {
      localStorage.setItem("app_locale", "ar");
      localStorage.setItem("souq.chatMenuTipSeen", "1");
    });
    const page = await context.newPage();

    await login(page, buyerEmail, PW);
    await page.goto(`${BASE}/messages`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissGate(page);
    await page.waitForTimeout(2000);

    const inboxShot = path.join(OUT, "01-inbox-no-avatar.png");
    await page.screenshot({ path: inboxShot, fullPage: true });
    report.screenshots.inbox = inboxShot;

    const inboxRing = await page.evaluate((sellerName) => {
      const rowBtn = [...document.querySelectorAll("li button")].find((el) =>
        el.textContent?.includes(sellerName),
      );
      const row = rowBtn?.closest("li") ?? rowBtn?.parentElement;
      const ringInRow = row?.querySelector(
        ".shadow-\\[0_0_16px_-4px_rgba\\(182\\,227\\,86\\,0\\.28\\)\\]",
      );
      const placeholder = row?.querySelector(".border-white\\/40");
      return {
        rowFound: Boolean(row),
        rowHasRing: Boolean(ringInRow),
        rowHasPlaceholderBorder: Boolean(placeholder),
        rowHasGrayOverride: Boolean(row?.querySelector(".bg-\\[\\#0A0A0A\\].rounded-full")),
      };
    }, sellerName);

    report.checks.inboxUsesProfileRing = {
      pass:
        inboxRing.rowFound &&
        inboxRing.rowHasRing &&
        inboxRing.rowHasPlaceholderBorder &&
        !inboxRing.rowHasGrayOverride,
      detail: inboxRing,
    };

    await page.goto(`${BASE}/users/${sellerId}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissGate(page);
    await page.waitForTimeout(1200);
    const profileShot = path.join(OUT, "02-public-profile-no-avatar.png");
    await page.screenshot({ path: profileShot, fullPage: true });
    report.screenshots.profile = profileShot;

    const profileRing = await page.evaluate(() => {
      const ring = document.querySelector(".shadow-\\[0_0_16px_-4px_rgba\\(182\\,227\\,86\\,0\\.28\\)\\]");
      const placeholder = document.querySelector(".border-white\\/40");
      return { hasRing: Boolean(ring), hasPlaceholderBorder: Boolean(placeholder) };
    });

    report.checks.profileHasRing = {
      pass: profileRing.hasRing && profileRing.hasPlaceholderBorder,
      detail: profileRing,
    };

    await browser.close();

    report.pass = report.checks.inboxUsesProfileRing.pass && report.checks.profileHasRing.pass;
    report.screenshotDir = OUT;

    console.log(JSON.stringify(report, null, 2));
    process.exit(report.pass ? 0 : 1);
  } finally {
    if (cleanup.convIds.length) {
      await pool.query(`delete from conversation_deletes where conversation_id = any($1::int[])`, [
        cleanup.convIds,
      ]);
      await pool.query(`delete from messages where conversation_id = any($1::int[])`, [cleanup.convIds]);
      await pool.query(`delete from conversations where id = any($1::int[])`, [cleanup.convIds]);
    }
    if (cleanup.adIds.length) {
      await pool.query(`delete from ads where id = any($1::int[])`, [cleanup.adIds]);
    }
    if (cleanup.userIds.length) {
      await pool.query(`delete from users where id = any($1::int[])`, [cleanup.userIds]);
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
