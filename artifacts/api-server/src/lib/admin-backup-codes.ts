import bcrypt from "bcryptjs";
import crypto from "crypto";

export type BackupCodesPayload = { v: 1; hashes: string[] };

export async function generateBackupCodes(count: number): Promise<{
  plainCodes: string[];
  payloadJson: string;
}> {
  const hashes: string[] = [];
  const plainCodes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(12).toString("base64url").slice(0, 16).toUpperCase();
    plainCodes.push(code);
    hashes.push(await bcrypt.hash(code, 10));
  }
  const payload: BackupCodesPayload = { v: 1, hashes };
  return { plainCodes, payloadJson: JSON.stringify(payload) };
}

export function parseBackupCodesPayload(raw: string | null | undefined): BackupCodesPayload | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const o = JSON.parse(raw) as BackupCodesPayload;
    if (o?.v !== 1 || !Array.isArray(o.hashes)) return null;
    return o;
  } catch {
    return null;
  }
}

/**
 * If code matches a backup hash, returns updated serialized payload with that hash removed.
 * Otherwise returns null.
 */
export async function consumeBackupCodeIfValid(
  rawCode: string,
  storedJson: string | null | undefined,
): Promise<string | null> {
  const payload = parseBackupCodesPayload(storedJson ?? null);
  if (!payload || payload.hashes.length === 0) return null;
  const normalized = String(rawCode ?? "")
    .trim()
    .toUpperCase();
  if (normalized.length < 8) return null;

  for (let i = 0; i < payload.hashes.length; i++) {
    const h = payload.hashes[i];
    if (!h) continue;
    const ok = await bcrypt.compare(normalized, h);
    if (ok) {
      const nextHashes = payload.hashes.filter((_, j) => j !== i);
      return JSON.stringify({ v: 1 as const, hashes: nextHashes } satisfies BackupCodesPayload);
    }
  }
  return null;
}
