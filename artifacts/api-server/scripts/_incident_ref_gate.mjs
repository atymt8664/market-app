/** Returns project ref fingerprint from DATABASE_URL without printing secrets. */
export function refFromUrl(url) {
  if (!url?.trim()) return null;
  const lower = url.toLowerCase();
  const m1 = lower.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (m1) return m1[1];
  const m2 = lower.match(/postgres\.([a-z0-9]+)/);
  if (m2) return m2[1];
  const m3 = lower.match(/@([a-z0-9]+)\.supabase\.co/);
  if (m3) return m3[1];
  if (lower.includes("nptfxtkedqndkgmrcntn")) return "nptfxtkedqndkgmrcntn";
  if (lower.includes("qkczposlooaldmsjfmun")) return "qkczposlooaldmsjfmun";
  return null;
}

const STAGING_REF = "qkczposlooaldmsjfmun";
const PROD_REF = "nptfxtkedqndkgmrcntn";

/** Blocks production; requires staging ref for DB scripts. */
export function assertStagingRef(url, label = "DATABASE_URL") {
  const ref = refFromUrl(url);
  if (ref === PROD_REF) {
    throw new Error(`${label} is PRODUCTION ref ${PROD_REF} — blocked`);
  }
  if (ref !== STAGING_REF) {
    throw new Error(
      `${label} is not staging ${STAGING_REF} (got ${ref ?? "unknown"})`,
    );
  }
  return ref;
}

export function assertProductionRef(url, label = "DATABASE_URL") {
  const ref = refFromUrl(url);
  if (ref === "qkczposlooaldmsjfmun") {
    throw new Error(`${label} is STAGING ref qkczposlooaldmsjfmun — blocked`);
  }
  if (ref !== "nptfxtkedqndkgmrcntn") {
    throw new Error(`${label} ref is not production nptfxtkedqndkgmrcntn (got ${ref ?? "unknown"})`);
  }
  return ref;
}
