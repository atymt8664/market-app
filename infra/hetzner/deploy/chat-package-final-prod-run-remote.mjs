/**
 * Upload tarball (if needed) and run chat-package-final-prod-remote.sh on VPS.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const VPS = "deploy@178.105.206.173";
const TAG = process.env.SOUQ_CHAT_IMAGE || `souq-api:chat-package-final-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
const tarball = path.join(repoRoot, ".chat-package-build-context.tgz");
const remoteSh = path.join(repoRoot, "infra/hetzner/deploy/chat-package-final-prod-remote.sh");

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: opts.silent ? "pipe" : "inherit",
    cwd: opts.cwd,
    maxBuffer: 64 * 1024 * 1024,
  });
}

const skipUpload = process.argv.includes("--skip-upload");
if (!skipUpload) {
  if (!fs.existsSync(tarball)) {
    console.error(JSON.stringify({ ok: false, error: "missing_tarball", path: tarball }));
    process.exit(2);
  }
  const scp1 = run("scp", ["-o", "BatchMode=yes", tarball, `${VPS}:/opt/souq-arab/build-context.tgz`]);
  if (scp1.status !== 0) process.exit(1);
}
const scp2 = run("scp", ["-o", "BatchMode=yes", remoteSh, `${VPS}:/tmp/chat-package-final-prod-remote.sh`]);
if (scp2.status !== 0) process.exit(1);

const r = run("ssh", [
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=30",
  VPS,
  `tr -d '\\r' < /tmp/chat-package-final-prod-remote.sh > /tmp/chat-package-final-prod-remote-lf.sh && chmod +x /tmp/chat-package-final-prod-remote-lf.sh && SOUQ_CHAT_IMAGE=${TAG} bash /tmp/chat-package-final-prod-remote-lf.sh`,
]);
if (r.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: "remote_failed", status: r.status }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, tag: TAG }));
