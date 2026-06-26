/**
 * PLS-1 manual scenario automation — auth validation + guest-welcome i18n.
 * Run: node scripts/pls-1-validation-e2e.mjs
 * Requires dev server at http://127.0.0.1:5173/
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PLS1_BASE_URL ?? "http://127.0.0.1:5173";
const LOCALES = ["ar", "en", "de"];

const localesDir = path.join(__dirname, "..", "src", "i18n", "locales");
const fullLocales = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(path.join(localesDir, `${l}.json`), "utf8"))]),
);
const gateLocales = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(path.join(localesDir, "gate", `${l}.json`), "utf8"))]),
);

const SIGNUP_VALIDATION_KEYS = [
  "auth.validation.first_name_required",
  "auth.validation.last_name_required",
  "auth.validation.country_required",
  "auth.validation.city_required",
  "auth.validation.invalid_email",
  "auth.validation.invalid_phone",
  "auth.validation.password_policy",
  "auth.validation.confirm_password_required",
  "auth.validation.accept_terms_required",
  "auth.validation.accept_privacy_required",
];

const LOGIN_VALIDATION_KEYS = [
  "auth.validation.invalid_email",
  "auth.validation.password_required",
];

const GUEST_KEYS = [
  "auth.shared.welcome_brand",
  "auth.shared.welcome_desc",
  "auth.guest.sign_in_first",
];

const results = [];

function record(section, locale, pass, detail) {
  results.push({ section, locale, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${section} (${locale}) — ${detail}`);
}

function assertNoTranslationKeys(text, label) {
  const hits = text.match(/auth\.(validation|shared|guest)\.[a-z0-9_]+/g);
  if (hits?.length) {
    throw new Error(`${label}: found raw keys: ${[...new Set(hits)].join(", ")}`);
  }
}

async function seedLocale(page, locale) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate((code) => {
    localStorage.setItem("app_locale", code);
  }, locale);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
}

async function waitForAppShell(page) {
  await page.waitForSelector("[data-bottom-nav-buttons], #main-content", { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function expectGuestWelcome(page, locale) {
  await seedLocale(page, locale);
  await page.goto(`${BASE}/guest-welcome?next=/messages`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const bodyText = await page.locator("body").innerText();
  assertNoTranslationKeys(bodyText, "guest-welcome");
  for (const key of GUEST_KEYS) {
    const expected = fullLocales[locale][key] ?? gateLocales[locale][key];
    if (!expected || !bodyText.includes(expected)) {
      throw new Error(`guest-welcome missing "${expected}" for key ${key}`);
    }
  }
}

async function testGuestNav(page, locale) {
  const navTargets = [
    { label: "favorites", next: "/favorites" },
    { label: "messages", next: "/messages" },
    { label: "create-ad", next: "/create-ad" },
    { label: "profile", next: "/profile" },
  ];

  await seedLocale(page, locale);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await waitForAppShell(page);

  for (const target of navTargets) {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await waitForAppShell(page);
    const buttons = page.locator("[data-bottom-nav-buttons] button");
    const index =
      target.label === "favorites"
        ? 0
        : target.label === "create-ad"
          ? 1
          : target.label === "messages"
            ? 2
            : 3;
    await buttons.nth(index).click();
    await page.waitForURL(/guest-welcome/, { timeout: 10000 });
    await page.waitForTimeout(1000);
    const bodyText = await page.locator("body").innerText();
    assertNoTranslationKeys(bodyText, `guest-nav:${target.label}`);
    const ctxKey = `auth.guest.context.${target.label === "create-ad" ? "create_ad" : target.label}`;
    const expected = fullLocales[locale][ctxKey] ?? gateLocales[locale][ctxKey];
    if (!expected || !bodyText.includes(expected)) {
      throw new Error(`guest-nav ${target.label} missing "${expected}"`);
    }
  }
}

async function collectFormErrors(page) {
  return page.locator('[id$="-form-item-message"]').allInnerTexts();
}

async function testLoginValidation(page, locale) {
  await seedLocale(page, locale);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("not-an-email");
  await page.locator('input[type="password"]').fill("");
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(400);
  const errors = await collectFormErrors(page);
  if (errors.length < 1) throw new Error("login: expected validation errors");
  const joined = errors.join("\n");
  assertNoTranslationKeys(joined, "login");
  for (const key of LOGIN_VALIDATION_KEYS) {
    const expected = fullLocales[locale][key];
    if (!joined.includes(expected)) {
      throw new Error(`login: missing ${key} text "${expected}"`);
    }
  }
}

async function testForgotPasswordValidation(page, locale) {
  await seedLocale(page, locale);
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("bad");
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(400);
  const errors = await collectFormErrors(page);
  const joined = errors.join("\n");
  assertNoTranslationKeys(joined, "forgot-password");
  const expected = fullLocales[locale]["auth.validation.invalid_email"];
  if (!joined.includes(expected)) throw new Error(`forgot-password: missing "${expected}"`);
}

async function testSignupValidation(page, locale) {
  await seedLocale(page, locale);
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(600);
  const errors = await collectFormErrors(page);
  const joined = errors.join("\n");
  assertNoTranslationKeys(joined, "signup-empty-submit");

  for (const key of SIGNUP_VALIDATION_KEYS) {
    const expected = fullLocales[locale][key];
    if (!expected) throw new Error(`missing locale string for ${key}`);
    if (!joined.includes(expected)) {
      throw new Error(`signup: missing translated message for ${key}: "${expected}"`);
    }
  }

  await page.locator('input[type="password"]').first().fill("Abcd1234");
  await page.locator('input[type="password"]').nth(1).fill("Abcd9999");
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(400);
  const mismatchErrors = await collectFormErrors(page);
  const mismatchJoined = mismatchErrors.join("\n");
  assertNoTranslationKeys(mismatchJoined, "signup-password-mismatch");
  const mismatchExpected = fullLocales[locale]["auth.validation.passwords_mismatch"];
  if (!mismatchJoined.includes(mismatchExpected)) {
    throw new Error(`signup: missing passwords_mismatch "${mismatchExpected}"`);
  }
}

async function runSection(name, fn) {
  for (const locale of LOCALES) {
    try {
      await fn(pageRef, locale);
      record(name, locale, true, "OK");
    } catch (err) {
      record(name, locale, false, err instanceof Error ? err.message : String(err));
    }
  }
}

let pageRef;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
pageRef = await context.newPage();

try {
  await pageRef.goto(BASE, { timeout: 15000, waitUntil: "domcontentloaded" });
} catch {
  console.error(`Dev server not reachable at ${BASE}. Start with: pnpm --filter @workspace/souq run dev`);
  process.exit(2);
}

await runSection("guest-welcome", expectGuestWelcome);
await runSection("guest-first-navigation", testGuestNav);
await runSection("login-validation", testLoginValidation);
await runSection("forgot-password-validation", testForgotPasswordValidation);
await runSection("signup-validation", testSignupValidation);

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log("\n--- PLS-1 E2E Summary ---");
console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(`  FAIL ${f.section} (${f.locale}): ${f.detail}`);
  process.exit(1);
}
console.log("ALL PASS");
