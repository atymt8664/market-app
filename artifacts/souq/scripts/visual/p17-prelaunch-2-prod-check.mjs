/**
 * P17-PRELAUNCH-2 — Production visual + API verification.
 * Usage: node scripts/visual/p17-prelaunch-2-prod-check.mjs [--web=https://www.souq-arab.com] [--api=https://api.souq-arab.com]
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = (process.argv.find((a) => a.startsWith("--web="))?.split("=")[1] ?? "https://www.souq-arab.com").replace(/\/$/, "");
const API = (process.argv.find((a) => a.startsWith("--api="))?.split("=")[1] ?? "https://api.souq-arab.com").replace(/\/$/, "");
const OUT = path.join(__dirname, "output", "p17-prelaunch-2-prod");
const report = { web: WEB, api: API, bottomNav: {}, ordersApi: {}, pass: false, errors: [] };

function fail(msg) {
  report.errors.push(msg);
  console.log(`  FAIL ${msg}`);
}

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

async function dismissGuestGate(page) {
  const btn = page.getByRole("button", { name: /متابعة|Continue|Fortfahren/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function measureBottomNavGap(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("[data-bottom-nav-shell]");
    if (!nav) return { found: false, gapPx: null, scrollSlackPx: null };
    const rect = nav.getBoundingClientRect();
    const gapPx = Math.max(0, window.innerHeight - rect.bottom);
    const scrollSlackPx = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const bottomCenter = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 1);
    const bottomBg =
      bottomCenter instanceof Element
        ? getComputedStyle(bottomCenter).backgroundColor
        : null;
    return {
      found: true,
      gapPx,
      scrollSlackPx,
      navBottom: rect.bottom,
      innerHeight: window.innerHeight,
      bottomBg,
    };
  });
}

async function checkBottomNav(page, label, screenshotName) {
  await page.goto(`${WEB}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await dismissGuestGate(page);
  await page.waitForSelector("[data-bottom-nav-shell]", { timeout: 30_000 });
  await page.waitForTimeout(800);

  const metrics = await measureBottomNavGap(page);
  report.bottomNav[label] = metrics;

  await page.screenshot({
    path: path.join(OUT, screenshotName),
    fullPage: false,
  });

  if (!metrics.found) {
    fail(`${label}: BottomNav shell not found`);
    return;
  }
  if (metrics.gapPx > 1.5) {
    fail(`${label}: gap below nav = ${metrics.gapPx.toFixed(2)}px (want ≤1.5px)`);
  } else {
    ok(`${label}: nav flush (gap=${metrics.gapPx?.toFixed(2)}px)`);
  }
  if (metrics.scrollSlackPx > 8) {
    fail(`${label}: document scroll slack below viewport = ${metrics.scrollSlackPx}px`);
  } else {
    ok(`${label}: no scroll gap under nav (slack=${metrics.scrollSlackPx}px)`);
  }
}

async function probeOrdersApiUnauthenticated() {
  const res = await fetch(`${API}/api/orders`, { redirect: "manual" });
  if (res.status === 401 || res.status === 403) {
    ok("GET /api/orders requires auth (route live)");
    report.ordersApi.unauthStatus = res.status;
    return;
  }
  fail(`GET /api/orders unexpected HTTP ${res.status}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log("=== P17-PRELAUNCH-2 Production Check ===\n");

  const hz = await fetch(`${API}/api/healthz`);
  if (hz.ok) ok(`API healthz ${API}`);
  else fail(`API healthz HTTP ${hz.status}`);

  await probeOrdersApiUnauthenticated();

  const browser = await chromium.launch({ headless: true });
  const iphone = devices["iPhone 14 Pro"];
  const mobile = await browser.newContext({
    ...iphone,
    locale: "ar",
    colorScheme: "dark",
  });
  const mobilePage = await mobile.newPage();
  await checkBottomNav(mobilePage, "iphone14pro", "bottom-nav-iphone14pro.png");

  const desktop = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar" });
  const desktopPage = await desktop.newPage();
  await checkBottomNav(desktopPage, "mobile390", "bottom-nav-mobile390.png");

  await browser.close();

  report.pass = report.errors.length === 0;
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nScreenshots: ${OUT}`);
  console.log(report.pass ? "\n=== PASS ===" : `\n=== FAIL (${report.errors.length} checks) ===`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
