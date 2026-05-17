export function getSentryDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function resolveSentryEnvironment(): string {
  const fromEnv = process.env.SENTRY_ENVIRONMENT?.trim();
  if (fromEnv) return fromEnv;
  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv) return nodeEnv;
  return "development";
}

export function resolveSentryRelease(): string | undefined {
  const release = process.env.SENTRY_RELEASE?.trim();
  return release || undefined;
}
