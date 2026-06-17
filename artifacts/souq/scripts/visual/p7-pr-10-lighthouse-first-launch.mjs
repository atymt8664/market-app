/**
 * P7-PR-10 — Lighthouse mobile lab for first-launch Language Gate (cleared storage).
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OUT = path.join(root, ".screenshots", "p7-pr-10-language-gate-lcp");
const base =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ??
  process.env.P7_PR10_BASE ??
  "http://127.0.0.1:4173";

mkdirSync(OUT, { recursive: true });
const outFile = path.join(OUT, "lighthouse-after-first-launch.json");

execSync(
  `npx --yes lighthouse@12 "${base}/" --only-categories=performance --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate --chrome-flags="--headless --no-sandbox" --output=json --output-path="${outFile}" --preset=perf --quiet`,
  { stdio: "inherit", cwd: root },
);

const report = JSON.parse(readFileSync(outFile, "utf8"));
const perf = report.categories?.performance?.score;
const fcp = report.audits["first-contentful-paint"]?.numericValue;
const lcp = report.audits["largest-contentful-paint"]?.numericValue;
const tbt = report.audits["total-blocking-time"]?.numericValue;
const cls = report.audits["cumulative-layout-shift"]?.numericValue;
const lcpItem = report.audits["largest-contentful-paint-element"]?.details?.items?.[0];

const summary = {
  generatedAt: new Date().toISOString(),
  base,
  performance: perf != null ? Math.round(perf * 100) : null,
  fcpMs: fcp != null ? Math.round(fcp) : null,
  lcpMs: lcp != null ? Math.round(lcp) : null,
  tbtMs: tbt != null ? Math.round(tbt) : null,
  cls: cls ?? null,
  lcpElement: lcpItem?.node?.snippet ?? lcpItem?.node?.selector ?? null,
};

writeFileSync(path.join(OUT, "lighthouse-after-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
