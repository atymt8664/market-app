#!/usr/bin/env node
/** Prints only JWT role + key length — never the key. */
import fs from "node:fs";

const file = process.argv[2] || "/opt/souq-arab/config/api.env.staging";
const text = fs.readFileSync(file, "utf8");
const m = text.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m);
if (!m) {
  console.log("role=missing len=0");
  process.exit(1);
}
const tok = m[1].trim().replace(/^["']|["']$/g, "");
const parts = tok.split(".");
if (parts.length < 2) {
  console.log(`role=invalid_jwt len=${tok.length}`);
  process.exit(1);
}
const payloadPart = parts[1];
const decoders = [
  () => Buffer.from(payloadPart, "base64url"),
  () => Buffer.from(payloadPart.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
];
for (const decode of decoders) {
  try {
    const payload = JSON.parse(decode().toString("utf8"));
    console.log(`role=${payload.role ?? "no_role"} len=${tok.length}`);
    process.exit(payload.role === "service_role" ? 0 : 1);
  } catch {
    /* next */
  }
}
console.log(`role=decode_error len=${tok.length}`);
process.exit(1);
