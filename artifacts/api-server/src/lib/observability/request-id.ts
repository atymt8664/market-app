import crypto from "node:crypto";

const REQUEST_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function resolveRequestId(incoming: string | string[] | undefined): string {
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  if (typeof raw === "string" && REQUEST_ID_RE.test(raw.trim())) {
    return raw.trim();
  }
  return createRequestId();
}
