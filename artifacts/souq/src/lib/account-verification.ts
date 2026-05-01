export type AccountVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

const VALID_STATUSES: AccountVerificationStatus[] = [
  "unverified",
  "pending",
  "verified",
  "rejected",
];

function toRecord(source: unknown): Record<string, unknown> | null {
  if (!source || typeof source !== "object") return null;
  return source as Record<string, unknown>;
}

export function getAccountVerificationStatus(
  source: unknown,
): AccountVerificationStatus {
  const value = toRecord(source);
  const raw =
    value?.["accountVerificationStatus"] ??
    value?.["verificationStatus"] ??
    value?.["verification_state"];
  if (typeof raw === "string" && VALID_STATUSES.includes(raw as AccountVerificationStatus)) {
    return raw as AccountVerificationStatus;
  }
  const isVerified = value?.["isVerified"] === true || value?.["verified"] === true;
  return isVerified ? "verified" : "unverified";
}

export function isAccountVerified(
  source: unknown,
): boolean {
  return getAccountVerificationStatus(source) === "verified";
}

