type RiskLevel = "safe" | "unknown" | "production-like";

type Assessment = {
  risk: RiskLevel;
  reasons: string[];
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

function hostOfUrl(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function parsePatterns(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function includesAny(host: string, patterns: string[]): boolean {
  if (!host) return false;
  return patterns.some((p) => host.includes(p));
}

function includesAnyInRaw(raw: string, patterns: string[]): boolean {
  if (!raw) return false;
  return patterns.some((p) => raw.includes(p));
}

function isPrivateOrLocalHost(host: string): boolean {
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

/**
 * Guards local/dev API startup against accidental production resources.
 * Production runtime is never blocked by this guard.
 */
export function assertSafeRuntimeEnv(): void {
  const nodeEnv = (process.env["NODE_ENV"] || "").trim().toLowerCase();
  if (nodeEnv === "production") return;

  if (isTrue(process.env["ALLOW_UNSAFE_LOCAL_ENV"])) return;

  const dbHost = hostOfUrl(process.env["DATABASE_URL"]);
  const dbRaw = (process.env["DATABASE_URL"] || "").trim().toLowerCase();
  const supabaseHost = hostOfUrl(process.env["SUPABASE_URL"]);
  const allowRemoteForLocal = isTrue(process.env["ALLOW_REMOTE_DB_IN_DEV"]);

  const blockedPatterns = [
    ...parsePatterns(process.env["PRODUCTION_DB_HOST_PATTERNS"]),
    ...parsePatterns(process.env["PRODUCTION_SUPABASE_HOST_PATTERNS"]),
  ];

  const reasons: string[] = [];

  if (blockedPatterns.length > 0) {
    if (includesAny(dbHost, blockedPatterns) || includesAnyInRaw(dbRaw, blockedPatterns)) {
      reasons.push("DATABASE_URL matches blocked production-like patterns");
    }
    if (includesAny(supabaseHost, blockedPatterns)) {
      reasons.push("SUPABASE_URL host matches blocked production-like patterns");
    }
  }

  const remoteDb = Boolean(dbHost) && !isPrivateOrLocalHost(dbHost);
  if (remoteDb && !allowRemoteForLocal) {
    reasons.push(
      "DATABASE_URL points to remote host while ALLOW_REMOTE_DB_IN_DEV is not enabled",
    );
  }

  const assessment: Assessment =
    reasons.length > 0
      ? { risk: "production-like", reasons }
      : dbHost
        ? { risk: "safe", reasons: [] }
        : { risk: "unknown", reasons: ["DATABASE_URL is missing or invalid"] };

  if (assessment.risk === "safe") return;

  const guidance = [
    "[env-safety] Refusing to start API in non-production mode.",
    ...assessment.reasons.map((r) => `- ${r}`),
    "Fix options:",
    "- Use a local/staging DATABASE_URL and SUPABASE_URL.",
    "- If you intentionally use remote staging DB, set ALLOW_REMOTE_DB_IN_DEV=1.",
    "- Configure PRODUCTION_DB_HOST_PATTERNS/PRODUCTION_SUPABASE_HOST_PATTERNS to block known production hosts.",
    "- Emergency bypass only: ALLOW_UNSAFE_LOCAL_ENV=1 (not recommended).",
  ].join("\n");

  throw new Error(guidance);
}
