/**
 * Live browser proof: simulates logged-in user (mock /api/auth/me) and exercises
 * Settings → Privacy/Terms/Help → Back. Prints final URL steps.
 *
 * Prerequisite: dev server on BASE_URL (default http://127.0.0.1:5173).
 * Run with API pointed to a dummy host so all XHR go through mocks, e.g.:
 *   set VITE_API_BASE_URL=http://127.0.0.1:5999 && pnpm exec vite --host 127.0.0.1 --port 5173
 *
 * Usage: node scripts/e2e-logged-in-nav.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";

const authUser = {
  id: 424242,
  email: "e2e-logged-in@example.com",
  name: "E2E Logged In",
  phone: "+490000000",
  city: "Berlin",
  emailVerified: true,
};

function fulfillJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "ar",
    viewport: { width: 390, height: 844 },
  });

  await context.addInitScript(() => {
    localStorage.setItem("app_locale", "ar");
    localStorage.setItem("theme", "dark");
  });

  await context.route("**/*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (!url.includes("/api/")) {
      return route.continue();
    }
    if (url.includes("/api/auth/me") && method === "GET") {
      return fulfillJson(route, authUser);
    }
    if (method === "GET") {
      return fulfillJson(route, []);
    }
    return fulfillJson(route, { ok: true });
  });

  const page = await context.newPage();

  const report = {
    baseUrl: BASE,
    loggedInSimulated: true,
    steps: [],
  };

  async function gotoSettings() {
    await page.goto(`${BASE}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  }

  await gotoSettings();

  // Stale signup intent (same tab before "login") — must not send user to /signup after Settings → Privacy
  await page.evaluate(() => {
    sessionStorage.setItem("souq.legalExplicitReturn", "/signup");
    sessionStorage.setItem("souq.returnTargetPath", "/signup");
  });

  await gotoSettings();

  const privacyRow = page.getByRole("button", { name: /سياسة الخصوصية/i });
  await privacyRow.scrollIntoViewIfNeeded();
  await privacyRow.click();
  await page.waitForURL(/\/privacy/, { timeout: 15_000 });
  const urlAfterOpenPrivacy = page.url();
  report.steps.push({ action: "open_privacy", url: urlAfterOpenPrivacy });

  // Simulate stale/wrong returnTo in address bar — trusted stash from Settings must still win
  await page.evaluate(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("returnTo", "/signup");
    window.history.replaceState({}, "", u.toString());
  });

  await page.getByRole("button", { name: "رجوع" }).first().click();
  await page.waitForURL((u) => u.pathname.endsWith("/settings"), { timeout: 15_000 });
  const urlAfterBackFromPrivacy = page.url();
  report.steps.push({ action: "back_from_privacy", url: urlAfterBackFromPrivacy });

  const termsRow = page.getByRole("button", { name: /الشروط والأحكام/i });
  await termsRow.scrollIntoViewIfNeeded();
  await termsRow.click();
  await page.waitForURL(/\/terms/, { timeout: 15_000 });
  report.steps.push({ action: "open_terms", url: page.url() });
  await page.getByRole("button", { name: "رجوع" }).first().click();
  await page.waitForURL((u) => u.pathname.endsWith("/settings"), { timeout: 15_000 });
  report.steps.push({ action: "back_from_terms", url: page.url() });

  const helpRow = page.getByRole("button", { name: /المساعدة والدعم/i });
  await helpRow.scrollIntoViewIfNeeded();
  await helpRow.click();
  await page.waitForURL(/\/account\/help/, { timeout: 15_000 });
  report.steps.push({ action: "open_help", url: page.url() });
  await page.getByRole("button", { name: "رجوع" }).first().click();
  await page.waitForURL((u) => u.pathname.endsWith("/settings"), { timeout: 15_000 });
  report.steps.push({ action: "back_from_help", url: page.url() });

  report.summary = {
    privacyBackIsSettings: /\/settings/.test(urlAfterBackFromPrivacy),
    noSignupInPrivacyFlow: !/\/signup/.test(urlAfterBackFromPrivacy),
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error("E2E failed:", e);
  process.exit(1);
});
