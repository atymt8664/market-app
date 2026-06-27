/**
 * EZpad visual snapshot — open URL and screencap.
 * Usage: node scripts/ezpad-visual-snap.mjs <label> <path>
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:5173";
const label = process.argv[2] ?? "shot";
const urlPath = process.argv[3] ?? "/";
const OUT = path.join(process.env.TEMP ?? "/tmp", "pls-ezpad-visual");
mkdirSync(OUT, { recursive: true });

execSync("adb reverse tcp:5173 tcp:5173", { stdio: "ignore" });
execSync(`adb shell am start -a android.intent.action.VIEW -d "${BASE}${urlPath}"`, {
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 5000));
const buf = execSync("adb exec-out screencap -p", { maxBuffer: 20 * 1024 * 1024 });
const file = `${label}.png`;
writeFileSync(path.join(OUT, file), buf);
console.log(JSON.stringify({ ok: true, file: path.join(OUT, file) }));
