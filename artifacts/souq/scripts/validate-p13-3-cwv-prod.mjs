#!/usr/bin/env node
/**
 * P13-3-B — Lighthouse mobile lab gate (production read-only).
 * Target: https://www.souq-arab.com — requires explicit approval to run.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  P13_API_ORIGIN,
  P13_ORIGIN,
  resolveSampleAdId,
  runCwvLabMatrix,
} from "./p13-3-cwv-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const adId = (await resolveSampleAdId(P13_API_ORIGIN)) ?? "1";
const routes = [
  { path: "/", label: "home" },
  { path: "/categories", label: "categories" },
  { path: "/search", label: "search" },
  { path: `/ad/${adId}`, label: "ad-detail" },
];

const errors = await runCwvLabMatrix({
  baseUrl: P13_ORIGIN,
  routes,
  artifactPath: join(root, ".lighthouse-p13-3-prod.json"),
});

if (errors.length) {
  console.error("[P13-3-B CWV Production Lab] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P13-3-B CWV Production Lab] PASS — primary routes meet LCP/CLS SLOs on production");
