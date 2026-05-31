#!/usr/bin/env node
/**
 * P13-3-B — Full local validate: readiness + Lighthouse preview lab.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));

function run(script) {
  const r = spawnSync(process.execPath, [join(scriptsDir, script)], {
    stdio: "inherit",
    env: process.env,
  });
  return r.status ?? 1;
}

const readiness = run("validate-p13-3-cwv-readiness.mjs");
if (readiness !== 0) process.exit(readiness);

const lab = run("validate-p13-3-cwv-lab.mjs");
process.exit(lab);
