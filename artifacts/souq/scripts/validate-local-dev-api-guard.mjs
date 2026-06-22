/**
 * P11 — Local dev API guard: static + runtime probes (dev only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const FRONTEND = process.env.LOCAL_DEV_GUARD_FRONTEND ?? "http://127.0.0.1:5173";
const API = process.env.API_PROXY_TARGET?.trim() || "http://127.0.0.1:3001";

const errors = [];
const checks = {};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const guardTs = read("src/lib/local-dev-api-guard.ts");
const guardTsx = read("src/components/local-dev-api-guard.tsx");
const appTsx = read("src/App.tsx");

if (!guardTs.includes("PRODUCTION_APP_HOSTS")) errors.push("missing_production_host_block");
if (!guardTs.includes("/api/healthz")) errors.push("missing_healthz_probe");
if (!guardTsx.includes('data-testid="local-dev-api-guard"')) errors.push("missing_testid");
if (!appTsx.includes("LocalDevApiGuardBanner")) errors.push("banner_not_mounted_in_app");

async function apiHealthOk() {
  try {
    const res = await fetch(`${API}/api/healthz`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const body = await res.json();
    return body.status === "ok";
  } catch {
    return false;
  }
}

async function frontendOk() {
  try {
    const res = await fetch(FRONTEND, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeUi({ blockHealthz }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  if (blockHealthz) {
    await context.route("**/api/healthz**", (route) =>
      route.fulfill({ status: 503, body: "down" }),
    );
  }
  await context.addInitScript(() => localStorage.setItem("app_locale", "ar"));
  const page = await context.newPage();
  await page.goto(`${FRONTEND}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  const banner = await page.locator('[data-testid="local-dev-api-guard"]').count();
  const adLinks = await page.locator('a[href*="/ad/"]').count();
  const healthStatus = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/healthz", { cache: "no-store" });
      return r.status;
    } catch {
      return 0;
    }
  });
  await browser.close();
  return { bannerVisible: banner > 0, adLinks, healthStatus };
}

checks.apiHealthDirect = await apiHealthOk();
checks.frontend = await frontendOk();

if (!checks.frontend) {
  errors.push("frontend_not_running_start_pnpm_dev_web");
} else {
  checks.simulatedApiDown = await probeUi({ blockHealthz: true });
  checks.simulatedApiUp = await probeUi({ blockHealthz: false });

  if (!checks.simulatedApiDown.bannerVisible) {
    errors.push("banner_missing_when_healthz_blocked");
  }
  if (checks.simulatedApiUp.bannerVisible) {
    errors.push("banner_visible_when_healthz_ok");
  }

  if (checks.apiHealthDirect) {
    if (checks.simulatedApiUp.adLinks <= 0) errors.push("home_ads_missing_when_api_up");
  }
}

const distDir = path.join(root, "dist/assets");
if (fs.existsSync(distDir)) {
  checks.distBuilt = true;
  checks.distContainsGuardModule = fs
    .readdirSync(distDir)
    .filter((f) => f.endsWith(".js"))
    .some((f) => fs.readFileSync(path.join(distDir, f), "utf8").includes("Local API is not running"));
}

const ok = errors.length === 0;
console.log(JSON.stringify({ ok, checks, errors, frontend: FRONTEND, api: API }, null, 2));
process.exit(ok ? 0 : 1);
