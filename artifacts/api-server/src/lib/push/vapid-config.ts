function envTrim(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function isPushConfigured(): boolean {
  return Boolean(
    envTrim("VAPID_PUBLIC_KEY") &&
      envTrim("VAPID_PRIVATE_KEY") &&
      envTrim("VAPID_SUBJECT"),
  );
}

export function getVapidConfig(): VapidConfig | null {
  const publicKey = envTrim("VAPID_PUBLIC_KEY");
  const privateKey = envTrim("VAPID_PRIVATE_KEY");
  const subject = envTrim("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey(): string | null {
  return getVapidConfig()?.publicKey ?? null;
}
