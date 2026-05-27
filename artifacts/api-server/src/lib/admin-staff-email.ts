export const STAFF_EMAIL_DOMAIN = "souq-arab.com";

const DEPARTMENT_SLUG: Record<string, string> = {
  moderation: "moderation",
  support: "support",
  verification: "verification",
  analytics: "analytics",
  finance: "finance",
  administration: "admin",
};

function slugifyName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s.-]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(".");
}

/** Internal login identifier only — not a real mailbox. */
export function suggestStaffLoginEmail(params: {
  displayName: string;
  departmentKey: string;
  roleKey: string;
  sequence?: number;
}): string {
  const dept = DEPARTMENT_SLUG[params.departmentKey] ?? "staff";
  const seq = params.sequence != null && params.sequence > 1 ? params.sequence : null;
  const nameSlug = slugifyName(params.displayName);
  if (nameSlug) {
    const local = seq != null ? `${nameSlug}.${dept}${seq}` : `${nameSlug}.${dept}`;
    return `${local}@${STAFF_EMAIL_DOMAIN}`;
  }
  const fallbackSeq = seq ?? 1;
  const padded = String(fallbackSeq).padStart(3, "0");
  return `${dept}${padded}@${STAFF_EMAIL_DOMAIN}`;
}

export async function resolveUniqueStaffLoginEmail(params: {
  displayName: string;
  departmentKey: string;
  roleKey: string;
  isEmailTaken: (email: string) => Promise<boolean>;
}): Promise<string> {
  const primary = suggestStaffLoginEmail(params);
  if (!(await params.isEmailTaken(primary))) return primary;

  for (let seq = 2; seq <= 99; seq += 1) {
    const candidate = suggestStaffLoginEmail({ ...params, sequence: seq });
    if (!(await params.isEmailTaken(candidate))) return candidate;
  }
  throw new Error("Could not generate a unique login email");
}
