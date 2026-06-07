/**
 * P17-7A Package 6 — Seller delivery address card DOM evidence (Playwright + mocked API).
 * Usage: node scripts/visual/p17-7a-pkg6-seller-address-check.mjs [--base=http://127.0.0.1:5173]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://127.0.0.1:5173";
const OUT = path.join(__dirname, "output", "p17-7a-pkg6-seller-address");
const ORDER_SHIP = "SOUQ-2026-910101";
const ORDER_PICKUP = "SOUQ-2026-910102";

const ADDRESS = {
  recipientName: "محمد أحمد",
  phone: "+4915123456789",
  countryCode: "DE",
  city: "Leipzig",
  postalCode: "04109",
  line1: "Musterstraße 12",
  line2: "Wohnung 3",
};

const errors = [];
const evidence = { base: BASE, shipping: {}, pickup: {}, pass: false };

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

function baseOrder(num, fulfillmentMode, buyerAddress) {
  return {
    id: num,
    orderNumber: num,
    status: "pending_confirmation",
    statusLabelAr: "بانتظار تأكيد البائع",
    title: "منتج P17-7A pkg6",
    totalAmount: "55.00",
    currency: "EUR",
    adId: 9101,
    buyerUserId: 9102,
    sellerUserId: 1,
    fulfillmentMode,
    subtotalAmount: "55.00",
    shippingAmount: fulfillmentMode === "shipping" ? "0.00" : "0.00",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedAtRelativeAr: "الآن",
    issueFlag: false,
    buyerAddress: buyerAddress ?? null,
  };
}

function wireApi(context) {
  context.route("**/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/api/auth/me") && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          email: "seller-pkg6@test.local",
          name: "Pkg6 Seller",
          emailVerified: true,
        }),
      });
      return;
    }

    if (method === "GET" && url.includes("/timeline")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orderId: ORDER_SHIP, items: [], mock: false }),
      });
      return;
    }

    if (method === "GET" && (url.includes(ORDER_SHIP) || url.includes(encodeURIComponent(ORDER_SHIP)))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: baseOrder(ORDER_SHIP, "shipping", ADDRESS),
          mock: false,
        }),
      });
      return;
    }

    if (method === "GET" && (url.includes(ORDER_PICKUP) || url.includes(encodeURIComponent(ORDER_PICKUP)))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: baseOrder(ORDER_PICKUP, "pickup", null),
          mock: false,
        }),
      });
      return;
    }

    await route.continue();
  });
}

async function dismissGuestGate(page) {
  const btn = page.getByRole("button", { name: /متابعة|Continue|Fortfahren/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function checkShipping(page) {
  await page.goto(`${BASE}/seller-orders/${ORDER_SHIP}`, { waitUntil: "networkidle" });
  await dismissGuestGate(page);
  await page.waitForSelector('[data-testid="p17-order-detail-page-seller"]', { timeout: 15_000 });

  const card = page.locator('[data-testid="p17-order-detail-seller-delivery-address"]');
  await card.waitFor({ state: "visible", timeout: 10_000 });
  evidence.shipping.cardVisible = await card.isVisible();

  for (const id of [
    "p17-seller-address-recipient",
    "p17-seller-address-phone",
    "p17-seller-address-country",
    "p17-seller-address-city",
    "p17-seller-address-postal",
    "p17-seller-address-street",
    "p17-seller-address-unit",
  ]) {
    const visible = await page.locator(`[data-testid="${id}"]`).isVisible();
    evidence.shipping[id] = visible;
    assert(visible, `missing field testid ${id}`);
  }

  const text = await card.innerText();
  assert(text.includes(ADDRESS.recipientName), "recipient not in card text");
  assert(text.includes(ADDRESS.phone), "phone not in card text");
  assert(text.includes(ADDRESS.line1), "street not in card text");
  evidence.shipping.cardTextSample = text.slice(0, 120);

  await page.screenshot({ path: path.join(OUT, "seller-shipping-address-card.png"), fullPage: true });
}

async function checkPickup(page) {
  await page.goto(`${BASE}/seller-orders/${ORDER_PICKUP}`, { waitUntil: "networkidle" });
  await dismissGuestGate(page);
  await page.waitForSelector('[data-testid="p17-order-detail-page-seller"]', { timeout: 15_000 });

  const card = page.locator('[data-testid="p17-order-detail-seller-delivery-address"]');
  const count = await card.count();
  evidence.pickup.cardCount = count;
  assert(count === 0, "pickup order must not show delivery address card");

  await page.screenshot({ path: path.join(OUT, "seller-pickup-no-address-card.png"), fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ar" });
  wireApi(context);
  const page = await context.newPage();

  try {
    await checkShipping(page);
    await checkPickup(page);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }

  evidence.pass = errors.length === 0;
  evidence.errors = errors;
  await writeFile(path.join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2));

  if (errors.length) {
    console.error("P17-7A pkg6 visual check FAIL:");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`Evidence: ${path.join(OUT, "evidence.json")}`);
    process.exit(1);
  }
  console.log("P17-7A pkg6 seller address visual check PASS");
  console.log(`Screenshots: ${OUT}`);
  process.exit(0);
}

void main();
