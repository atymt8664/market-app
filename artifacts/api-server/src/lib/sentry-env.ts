/** Sentry DSN from environment only — never hardcode. */
export function getSentryDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN?.trim();
  return dsn || undefined;
}

/** Production/staging/development label for Sentry environment filter. */
export function resolveSentryEnvironment(): string {
  const fromEnv = process.env.SENTRY_ENVIRONMENT?.trim();
  if (fromEnv) return fromEnv;

  const railwayEnv = process.env.RAILWAY_ENVIRONMENT_NAME?.trim();
  if (railwayEnv) return railwayEnv;

  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv) return nodeEnv;

  return "development";
}

/**
 * Release version for grouping deploys in Sentry.
 * Auto-derived on Railway when SENTRY_RELEASE is unset.
 */
export function resolveSentryRelease(): string | undefined {
  const explicit = process.env.SENTRY_RELEASE?.trim();
  if (explicit) return explicit;

  const sha =
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.RAILWAY_GIT_COMMIT?.trim() ||
    process.env.GIT_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim();

  if (sha) {
    const short = sha.replace(/[^a-f0-9]/gi, "").slice(0, 12) || sha.slice(0, 12);
    return `souq-api@${short}`;
  }

  return undefined;
}
