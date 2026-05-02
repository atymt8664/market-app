import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const UPLOADS_BUCKET = (process.env["SUPABASE_UPLOADS_BUCKET"] || "uploads").trim();
const MAX_UPLOAD_ATTEMPTS = 3;
let uploadsBucketEnsured = false;

export class MissingSupabaseStorageConfigError extends Error {
  constructor(public readonly missingEnvVar: string) {
    super(`Missing required Supabase storage env var: ${missingEnvVar}`);
    this.name = "MissingSupabaseStorageConfigError";
    Object.setPrototypeOf(this, MissingSupabaseStorageConfigError.prototype);
  }
}

/**
 * The anon/auth JWT must never be used as SUPABASE_SERVICE_ROLE_KEY — Storage will still
 * enforce RLS and uploads fail with "new row violates row-level security policy".
 */
export class InvalidSupabaseServiceRoleKeyError extends Error {
  constructor(public readonly jwtRole: string | null) {
    super(
      `SUPABASE_SERVICE_ROLE_KEY must be the service_role key from Supabase Dashboard → Project Settings → API (JWT role is "${jwtRole ?? "unknown"}", expected "service_role").`,
    );
    this.name = "InvalidSupabaseServiceRoleKeyError";
    Object.setPrototypeOf(this, InvalidSupabaseServiceRoleKeyError.prototype);
  }
}

/** Upstream Storage unreachable (undici "fetch failed", DNS, TLS, timeout, etc.). */
export class SupabaseStorageConnectionError extends Error {
  readonly code = "SUPABASE_STORAGE_CONNECTION_FAILED" as const;
  constructor(
    public readonly step: string,
    public readonly causeMessage: string,
  ) {
    super(causeMessage);
    this.name = "SupabaseStorageConnectionError";
    Object.setPrototypeOf(this, SupabaseStorageConnectionError.prototype);
  }
}

/** Bucket missing and could not be created or used. */
export class SupabaseStorageBucketNotFoundError extends Error {
  readonly code = "BUCKET_NOT_FOUND" as const;
  constructor(
    public readonly step: string,
    public readonly causeMessage: string,
  ) {
    super(causeMessage);
    this.name = "SupabaseStorageBucketNotFoundError";
    Object.setPrototypeOf(this, SupabaseStorageBucketNotFoundError.prototype);
  }
}

let storageClientDiagnosticsLogged = false;

function logSupabaseStorageDiagnostics(url: string, jwtRole: string | null): void {
  if (storageClientDiagnosticsLogged) return;
  storageClientDiagnosticsLogged = true;
  try {
    const u = new URL(url);
    logger.info(
      {
        supabaseHost: u.hostname,
        supabaseHttps: u.protocol === "https:",
        serviceRoleJwtClaim: jwtRole ?? "undecoded",
        serviceRoleValid: jwtRole === "service_role",
      },
      "Supabase storage client configured",
    );
  } catch {
    /* ignore */
  }
}

/** Matches undici/Node fetch failures and common TCP/DNS errors (no secrets). */
function isLikelySupabaseConnectionFailure(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("enotfound") ||
    m.includes("enetunreach") ||
    m.includes("eai_again") ||
    m.includes("certificate") ||
    m.includes("ssl") ||
    m.includes("tls") ||
    m.includes("und_err") ||
    m.includes("getaddrinfo")
  );
}

function isBucketMissingMessage(message: string): boolean {
  const m = (message || "").toLowerCase();
  if (/bucket not found|no such bucket|unknown bucket/i.test(m)) return true;
  if (/not found/.test(m) && /bucket|storage object/i.test(m)) return true;
  return false;
}

function createBucketAlreadyExists(message: string): boolean {
  return /already exists|duplicate|bucket already exists/i.test(message || "");
}

/** Best-effort JWT payload role read (no signature verification — sanity check only). */
export function readSupabaseKeyJwtRole(key: string): string | null {
  const t = key.trim();
  if (!t || t.split(".").length < 2) return null;
  const payloadPart = t.split(".")[1]!;
  const decoders: Array<() => Buffer> = [
    () => Buffer.from(payloadPart, "base64url"),
    () =>
      Buffer.from(
        payloadPart.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ),
  ];
  for (const decode of decoders) {
    try {
      const json = decode().toString("utf8");
      const payload = JSON.parse(json) as { role?: string };
      return typeof payload.role === "string" ? payload.role : null;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Normalize dashboard "Project URL" for @supabase/supabase-js.
 * Common mis-pastes: trailing slash, `/rest/v1`, or DB pooler host instead of API host.
 */
function normalizeSupabaseProjectUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1\/?$/i, "");
  try {
    const u = new URL(url);
    if (/pooler\.supabase\.com$/i.test(u.hostname)) {
      throw new Error(
        "SUPABASE_URL must be the HTTPS Project URL (https://<ref>.supabase.co), not the Postgres pooler host.",
      );
    }
    if (!/\.supabase\.co$/i.test(u.hostname)) {
      logger.warn(
        { hostname: u.hostname },
        "SUPABASE_URL hostname does not look like *.supabase.co — Storage may fail; use Project Settings → API → Project URL",
      );
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new MissingSupabaseStorageConfigError("SUPABASE_URL");
    }
    throw e;
  }
  return url;
}

function getSupabaseStorageClient(): SupabaseClient {
  const rawUrl = process.env["SUPABASE_URL"] || "";
  let url: string;
  try {
    url = normalizeSupabaseProjectUrl(rawUrl);
  } catch (e) {
    if (e instanceof MissingSupabaseStorageConfigError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }
  if (!url) {
    throw new MissingSupabaseStorageConfigError("SUPABASE_URL");
  }
  const serviceRoleKey = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  if (!serviceRoleKey) {
    throw new MissingSupabaseStorageConfigError("SUPABASE_SERVICE_ROLE_KEY");
  }

  const jwtRole = readSupabaseKeyJwtRole(serviceRoleKey);
  if (jwtRole && jwtRole !== "service_role") {
    logger.error(
      {
        jwtRole,
        hint: "Paste the service_role key from Supabase API settings into Railway SUPABASE_SERVICE_ROLE_KEY",
      },
      "Invalid SUPABASE_SERVICE_ROLE_KEY: JWT role is not service_role",
    );
    throw new InvalidSupabaseServiceRoleKeyError(jwtRole);
  }
  if (!jwtRole) {
    logger.warn(
      "Could not decode JWT role from SUPABASE_SERVICE_ROLE_KEY; if uploads fail with RLS, verify the key is the service_role secret",
    );
  }

  logSupabaseStorageDiagnostics(url, jwtRole);

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => globalThis.fetch(input as RequestInfo, init as RequestInit),
    },
  });
}

/**
 * Ensure uploads bucket exists without listBuckets (it can fail with undici "fetch failed" on some hosts).
 * Uses createBucket only; if that fails with a network error, we continue — upload may still work if the bucket exists.
 */
async function ensureUploadsBucketExists(supabase: SupabaseClient): Promise<void> {
  if (uploadsBucketEnsured) return;

  const { error: createError } = await supabase.storage.createBucket(UPLOADS_BUCKET, {
    public: true,
  });
  const msg = createError?.message ?? "";

  if (!createError || createBucketAlreadyExists(msg)) {
    uploadsBucketEnsured = true;
    if (createError && createBucketAlreadyExists(msg)) {
      logger.info({ bucket: UPLOADS_BUCKET, step: "createBucket" }, "Uploads bucket already exists");
    }
    return;
  }

  if (isLikelySupabaseConnectionFailure(msg)) {
    logger.warn(
      {
        step: "createBucket",
        bucket: UPLOADS_BUCKET,
        message: msg,
      },
      "Bucket preflight failed (network); attempting upload without listBuckets/create success",
    );
    return;
  }

  logger.error(
    { step: "createBucket", bucket: UPLOADS_BUCKET, message: msg },
    "Supabase storage createBucket failed",
  );
  if (isBucketMissingMessage(msg) || /not found/i.test(msg)) {
    throw new SupabaseStorageBucketNotFoundError("createBucket", msg);
  }
  throw new Error(`Failed to create uploads bucket: ${msg}`);
}

async function tryCreateUploadsBucket(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.storage.createBucket(UPLOADS_BUCKET, {
    public: true,
  });
  const msg = error?.message ?? "";
  if (!error || createBucketAlreadyExists(msg)) {
    uploadsBucketEnsured = true;
    return;
  }
  if (isLikelySupabaseConnectionFailure(msg)) {
    throw new SupabaseStorageConnectionError("createBucket", msg);
  }
  if (isBucketMissingMessage(msg)) {
    throw new SupabaseStorageBucketNotFoundError("createBucket", msg);
  }
  throw new Error(`Failed to create uploads bucket: ${msg}`);
}

export async function uploadAdImagesForUser(
  userId: number,
  files: Array<{ buffer: Buffer; mimetype: string }>,
): Promise<string[]> {
  const supabase = getSupabaseStorageClient();
  await ensureUploadsBucketExists(supabase);

  const urls: string[] = [];

  for (const file of files) {
    const objectPath = `ads/${userId}/${crypto.randomUUID()}.jpg`;
    let lastError: Error | null = null;
    let triedBucketRecovery = false;

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
      const { error } = await supabase.storage.from(UPLOADS_BUCKET).upload(objectPath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

      if (!error) {
        uploadsBucketEnsured = true;
        const { data } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(objectPath);
        urls.push(data.publicUrl);
        lastError = null;
        break;
      }

      logger.error(
        {
          step: "upload",
          bucket: UPLOADS_BUCKET,
          objectPath,
          message: error.message,
          statusCode: (error as { statusCode?: string }).statusCode,
        },
        "Supabase storage upload failed for ad image",
      );

      const errMsg = error.message || "";
      if (isLikelySupabaseConnectionFailure(errMsg)) {
        throw new SupabaseStorageConnectionError("upload", errMsg);
      }

      if (isBucketMissingMessage(errMsg) && !triedBucketRecovery) {
        triedBucketRecovery = true;
        await tryCreateUploadsBucket(supabase);
        attempt -= 1;
        continue;
      }

      if (isBucketMissingMessage(errMsg) && triedBucketRecovery) {
        throw new SupabaseStorageBucketNotFoundError("upload", errMsg);
      }

      lastError = new Error(error.message || "Upload failed");
      if (attempt < MAX_UPLOAD_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  return urls;
}

export async function uploadAvatarImageForUser(
  userId: number,
  file: { buffer: Buffer; mimetype: string },
): Promise<string> {
  const supabase = getSupabaseStorageClient();
  await ensureUploadsBucketExists(supabase);

  const objectPath = `avatars/${userId}/${crypto.randomUUID()}.jpg`;
  let lastError: Error | null = null;
  let triedBucketRecovery = false;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (!error) {
      uploadsBucketEnsured = true;
      const { data } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(objectPath);
      return data.publicUrl;
    }

    logger.error(
      {
        step: "upload",
        bucket: UPLOADS_BUCKET,
        objectPath,
        message: error.message,
        statusCode: (error as { statusCode?: string }).statusCode,
      },
      "Supabase storage upload failed for avatar",
    );

    const errMsg = error.message || "";
    if (isLikelySupabaseConnectionFailure(errMsg)) {
      throw new SupabaseStorageConnectionError("upload", errMsg);
    }

    if (isBucketMissingMessage(errMsg) && !triedBucketRecovery) {
      triedBucketRecovery = true;
      await tryCreateUploadsBucket(supabase);
      attempt -= 1;
      continue;
    }

    if (isBucketMissingMessage(errMsg) && triedBucketRecovery) {
      throw new SupabaseStorageBucketNotFoundError("upload", errMsg);
    }

    lastError = new Error(error.message || "Avatar upload failed");
    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw lastError ?? new Error("Avatar upload failed");
}

