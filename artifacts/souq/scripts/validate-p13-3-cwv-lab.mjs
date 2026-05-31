#!/usr/bin/env node
/**
 * P13-3-B — Lighthouse mobile lab gate (local preview).
 * Requires: pnpm build, playwright chromium, lighthouse.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  P13_API_ORIGIN,
  resolveSampleAdId,
  runCwvLabMatrix,
} from "./p13-3-cwv-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const previewHost = process.env.CWV_PREVIEW_HOST ?? "127.0.0.1";
const previewPort = Number(process.env.CWV_PREVIEW_PORT ?? "4173");
const baseUrl = `http://${previewHost}:${previewPort}`;

if (!existsSync(distDir)) {
  console.error("[P13-3-B CWV Lab] FAIL — run `pnpm build` before cwv:p13:validate lab");
  process.exit(1);
}

async function waitForHttp(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server not ready: ${url}`);
}

function startPreview() {
  return spawn(
    process.execPath,
    [
      join(root, "node_modules/vite/bin/vite.js"),
      "preview",
      "--host",
      previewHost,
      "--port",
      String(previewPort),
      "--strictPort",
    ],
    {
      cwd: root,
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
    },
  );
}

const preview = startPreview();
let exitCode = 1;

try {
  await waitForHttp(`${baseUrl}/`);

  const adId = (await resolveSampleAdId(P13_API_ORIGIN)) ?? "1";
  const routes = [
    { path: "/", label: "home" },
    { path: "/categories", label: "categories" },
    { path: "/search", label: "search" },
    { path: `/ad/${adId}`, label: "ad-detail" },
  ];

  const errors = await runCwvLabMatrix({
    baseUrl,
    routes,
    artifactPath: join(root, ".lighthouse-p13-3-preview.json"),
  });

  if (errors.length) {
    console.error("[P13-3-B CWV Lab] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
    exitCode = 1;
  } else {
    console.log(
      "[P13-3-B CWV Lab] PASS — primary routes meet LCP/CLS SLOs (preview lab)",
    );
    exitCode = 0;
  }
} catch (e) {
  console.error("[P13-3-B CWV Lab] FAIL —", e instanceof Error ? e.message : e);
  exitCode = 1;
} finally {
  preview.kill("SIGTERM");
  process.exit(exitCode);
}
