/**
 * CHAT PACKAGE FINAL — build tarball, upload, deploy on VPS (prod-shadow :3002).
 * Usage: node infra/hetzner/deploy/chat-package-final-prod-deploy.mjs
 *        node infra/hetzner/deploy/chat-package-final-prod-deploy.mjs --skip-upload
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const VPS = "deploy@178.105.206.173";
const TAG =
  process.env.SOUQ_CHAT_IMAGE || "souq-api:chat-package-final-20260618-r1";
const tarball = path.join(repoRoot, ".chat-package-build-context.tgz");
const remoteSh = path.join(repoRoot, "infra/hetzner/deploy/chat-package-final-prod-remote.sh");

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: opts.silent ? "pipe" : "inherit",
    cwd: opts.cwd,
    input: opts.input,
    maxBuffer: 64 * 1024 * 1024,
  });
}

const skipUpload = process.argv.includes("--skip-upload");

for (const rel of [
  "lib/db/migrations/030_p5_conversation_deletes.sql",
  "artifacts/souq/src/components/chat-inbox-delete-undo-snackbar.tsx",
  "artifacts/api-server/src/routes/conversations.ts",
]) {
  if (!fs.existsSync(path.join(repoRoot, rel))) {
    console.error(JSON.stringify({ ok: false, error: "missing_file", rel }));
    process.exit(2);
  }
}

if (!skipUpload) {
  if (fs.existsSync(tarball)) fs.unlinkSync(tarball);
  const tar = run(
    "tar",
    [
      "-czf",
      tarball,
      "--exclude=node_modules",
      "--exclude=.git",
      "--exclude=.cursor",
      "--exclude=diagnostics",
      "--exclude=artifacts/souq/node_modules",
      "--exclude=artifacts/souq/.screenshots",
      "--exclude=artifacts/souq/.p9*",
      "--exclude=artifacts/souq/.psi*",
      "--exclude=artifacts/souq/scripts/output",
      "--exclude=artifacts/souq/scripts/.screenshots",
      "--exclude=artifacts/souq/scripts/e2e/output",
      "--exclude=artifacts/api-server/scripts/output",
      "--exclude=**/.lighthouse*",
      "--exclude=.env",
      "--exclude=.env.local",
      "--exclude=tmp-*",
      "-C",
      repoRoot,
      ".",
    ],
    { silent: true },
  );
  if (tar.status !== 0) {
    console.error(JSON.stringify({ ok: false, error: "tar_failed" }));
    process.exit(1);
  }
  console.log(JSON.stringify({ step: "tarball", sizeMb: (fs.statSync(tarball).size / 1048576).toFixed(1) }));
  const scp1 = run("scp", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=300", tarball, `${VPS}:/opt/souq-arab/build-context.tgz`]);
  if (scp1.status !== 0) process.exit(1);
}

// Write LF-only remote script locally then upload (avoid Windows CRLF).
const remoteLf = fs.readFileSync(remoteSh, "utf8").replace(/\r\n/g, "\n");
const localLf = path.join(repoRoot, ".chat-package-remote-lf.sh");
fs.writeFileSync(localLf, remoteLf, "utf8");

const scp2 = run("scp", ["-o", "BatchMode=yes", localLf, `${VPS}:/tmp/chat-package-final-prod-remote.sh`]);
if (scp2.status !== 0) process.exit(1);

console.log(JSON.stringify({ step: "remote_deploy", tag: TAG }));
const r = run("ssh", [
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=30",
  VPS,
  `chmod +x /tmp/chat-package-final-prod-remote.sh && SOUQ_CHAT_IMAGE=${TAG} bash /tmp/chat-package-final-prod-remote.sh`,
]);
if (r.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: "remote_failed", status: r.status }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, tag: TAG }));
