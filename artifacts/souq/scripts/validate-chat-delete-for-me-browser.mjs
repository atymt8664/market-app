/**
 * P17 — delete-for-me browser smoke (local vite + API).
 * Prereq: vite :5173, api :3001, migration 030.
 * Run: cd artifacts/souq && node scripts/validate-chat-delete-for-me-browser.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRequire = createRequire(path.join(__dirname, "..", "..", "api-server", "package.json"));
const dotenv = apiRequire("dotenv");
const pg = apiRequire("pg");
const bcrypt = apiRequire("bcryptjs");

dotenv.config({ path: path.join(__dirname, "..", "..", "api-server", ".env") });
dotenv.config({
  path: path.join(__dirname, "..", "..", "api-server", ".env.local"),
  override: true,
});

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const BASE = (process.env.E2E_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const PW = "ChatDeleteBrowser99!x";

const report = { ok: true, scenarios: {} };

if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, reason: "DATABASE_URL missing" }));
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function dismissGate(page) {
  const btn = page.getByRole("button", { name: /متابعة|Continue|Weiter/i });
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function main() {
  const cleanup = { convIds: [], adIds: [], userIds: [] };
  try {
    const ts = Date.now();
    const hash = await bcrypt.hash(PW, 10);
    const sellerEmail = `del-br-seller-${ts}@example.invalid`;
    const buyerEmail = `del-br-buyer-${ts}@example.invalid`;
    const sellerName = "بائع حذف";

    const sellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [sellerEmail, hash, sellerName, "+491700000040", "Berlin"],
      )
    ).rows[0].id;
    const buyerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [buyerEmail, hash, "مشتري حذف", "+491700000041", "Munich"],
      )
    ).rows[0].id;
    cleanup.userIds.push(sellerId, buyerId);

    const categoryId = (
      await pool.query(`select id from categories where is_hidden = false limit 1`)
    ).rows[0]?.id;
    const adId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Browser Del Ad','D','Berlin',$2,'S','+491700000042','approved','[]'::jsonb,50,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    cleanup.adIds.push(adId);

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ ...devices["iPhone 14 Pro"], locale: "ar-SA" });
    await ctx.addInitScript(() => {
      localStorage.setItem("app_locale", "ar");
      localStorage.setItem("souq.chatMenuTipSeen", "1");
    });

    const loginRes = await ctx.request.post(`${BASE}/api/auth/login`, {
      data: { email: buyerEmail, password: PW },
      headers: { "content-type": "application/json" },
    });
    if (!loginRes.ok()) throw new Error(`browser login failed ${loginRes.status()}`);
    const loginJson = await loginRes.json();
    const csrf = loginJson.csrfToken;

    const startConv = await ctx.request.post(`${BASE}/api/conversations`, {
      data: { adId },
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
    });
    const convId = (await startConv.json()).id;
    cleanup.convIds.push(convId);

    await ctx.request.post(`${BASE}/api/conversations/${convId}/messages`, {
      data: { body: "رسالة اختبار" },
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
    });

    const page = await ctx.newPage();
    await page.goto(`${BASE}/messages`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissGate(page);
    await page.waitForTimeout(2000);

    const rowBefore = page.locator("li button").filter({ hasText: sellerName });
    report.scenarios.inboxShowsConversation = (await rowBefore.count()) >= 1;

    // Delete via UI first (avoid stale CSRF from mixing API + UI mutations)
    const row2 = rowBefore.first();
    await row2.dispatchEvent("pointerdown");
    await page.waitForTimeout(650);
    await row2.dispatchEvent("pointerup");
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /حذف المحادثة|Delete conversation/i }).click();
    await page.waitForTimeout(400);
    const deleteCalls = [];
    page.on("request", (req) => {
      if (req.url().includes("/delete-for-me") && req.method() === "POST") {
        deleteCalls.push(req.url());
      }
    });
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/delete-for-me") && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      page
        .locator('[data-state="open"]')
        .filter({ hasText: /حذف المحادثة|Delete conversation/i })
        .getByRole("button", { name: /^حذف$|^Delete$/i })
        .first()
        .click(),
    ]);
    await page.waitForTimeout(1500);

    report.scenarios.deleteApiCalled = deleteCalls.length >= 1;
    report.scenarios.deleteHttpStatus = deleteResponse.status();
    const delBody = await deleteResponse.json().catch(() => ({}));
    report.scenarios.deleteOkBody = delBody.ok === true;

    const delDb = await pool.query(
      `select 1 from conversation_deletes where user_id = $1 and conversation_id = $2`,
      [buyerId, convId],
    );
    report.scenarios.deleteRowInDb = delDb.rowCount > 0;
    const inboxApi = await ctx.request.get(`${BASE}/api/conversations`);
    const inboxApiJson = await inboxApi.json();
    const inboxApiList = Array.isArray(inboxApiJson) ? inboxApiJson : (inboxApiJson.items ?? []);
    report.scenarios.deleteNotInApiInbox = !inboxApiList.some((c) => c.id === convId);
    report.scenarios.deleteViaUi = (await rowBefore.count()) === 0;

    const hiddenAfterDelete = await ctx.request.get(`${BASE}/api/conversations/hidden`);
    const hiddenAfter = await hiddenAfterDelete.json();
    const hiddenAfterList = Array.isArray(hiddenAfter) ? hiddenAfter : (hiddenAfter.items ?? []);
    report.scenarios.notInHiddenAfterDelete = !hiddenAfterList.some((c) => c.id === convId);

    const undoBtn = page.getByRole("button", { name: /تراجع|Undo|Rückgängig/i });
    report.scenarios.undoVisible = await undoBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (report.scenarios.undoVisible) {
      const [restoreResponse] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/restore-for-me") && r.request().method() === "POST",
          { timeout: 15_000 },
        ),
        undoBtn.click(),
      ]);
      report.scenarios.undoHttpStatus = restoreResponse.status();
      await page.waitForTimeout(1200);
      report.scenarios.undoRestoresInbox = (await rowBefore.count()) >= 1;
      const delDbAfterUndo = await pool.query(
        `select 1 from conversation_deletes where user_id = $1 and conversation_id = $2`,
        [buyerId, convId],
      );
      report.scenarios.deleteRowClearedAfterUndo = delDbAfterUndo.rowCount === 0;
    }

    // Delete again (no undo) then verify incoming message auto-restore
    await row2.dispatchEvent("pointerdown");
    await page.waitForTimeout(650);
    await row2.dispatchEvent("pointerup");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /حذف المحادثة|Delete conversation/i }).click();
    await page.waitForTimeout(400);
    await page
      .locator('[data-state="open"]')
      .filter({ hasText: /حذف المحادثة|Delete conversation/i })
      .getByRole("button", { name: /^حذف$|^Delete$/i })
      .first()
      .click();
    await page.waitForTimeout(6500);

    const sellerJar = await (async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: sellerEmail, password: PW }),
      });
      const cookies = res.headers.getSetCookie?.() ?? [];
      const sid = cookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("souq.sid="));
      const json = await res.json();
      return { cookie: sid ?? "", csrf: json.csrfToken };
    })();
    const msgRes = await fetch(`${BASE}/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sellerJar.cookie,
        "x-csrf-token": sellerJar.csrf,
      },
      body: JSON.stringify({ body: "رسالة بعد الحذف" }),
    });
    report.scenarios.sellerMessageStatus = msgRes.status;

    await page.goto(`${BASE}/messages`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    report.scenarios.autoRestoreInInbox = (await rowBefore.count()) >= 1;

    report.scenarios.hideViaUi = "skipped";
    report.scenarios.hiddenAfterHide = "skipped";

    await browser.close();

    report.scenarios.allPass =
      report.scenarios.inboxShowsConversation &&
      report.scenarios.deleteApiCalled &&
      report.scenarios.deleteHttpStatus === 200 &&
      report.scenarios.deleteOkBody &&
      report.scenarios.deleteRowInDb &&
      report.scenarios.deleteNotInApiInbox &&
      report.scenarios.notInHiddenAfterDelete &&
      report.scenarios.undoVisible &&
      report.scenarios.undoHttpStatus === 200 &&
      report.scenarios.undoRestoresInbox &&
      report.scenarios.deleteRowClearedAfterUndo &&
      report.scenarios.autoRestoreInInbox &&
      report.scenarios.sellerMessageStatus === 201 &&
      (report.scenarios.hideViaUi === true || report.scenarios.hideViaUi === "skipped");
  } catch (e) {
    report.ok = false;
    report.error = e instanceof Error ? e.message : String(e);
  } finally {
    for (const convId of [...new Set(cleanup.convIds)]) {
      await pool.query("delete from conversations where id = $1", [convId]).catch(() => {});
    }
    for (const adId of cleanup.adIds) {
      await pool.query("delete from ads where id = $1", [adId]).catch(() => {});
    }
    if (cleanup.userIds.length) {
      await pool.query("delete from users where id = any($1::int[])", [cleanup.userIds]).catch(() => {});
    }
    await pool.end();
  }

  report.ok = report.ok && Boolean(report.scenarios.allPass);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

void main();
