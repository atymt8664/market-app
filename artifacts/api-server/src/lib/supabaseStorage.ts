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
    if (/^db\./i.test(u.hostname)) {
      logger.warn(
        { hostname: u.hostname },
        "SUPABASE_URL looks like a direct DB host (db.*) — use https://<project-ref>.supabase.co from API settings",
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

/**
 * Startup-only: DNS + raw fetch to Storage REST (no secrets logged).
 * Helps diagnose Railway ↔ Supabase "fetch failed" (DNS, IPv6, TLS, wrong host).
 */
export async function runSupabaseStorageStartupProbe(): Promise<void> {
  const rawUrl = (process.env["SUPABASE_URL"] || "").trim();
  const serviceRoleKey = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  if (!rawUrl || !serviceRoleKey) {
    logger.info("Supabase Storage probe skipped (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset)");
    return;
  }

  let normalized: string;
  try {
    normalized = normalizeSupabaseProjectUrl(rawUrl);
  } catch (e) {
    logger.warn(
      { errMessage: e instanceof Error ? e.message : String(e) },
      "Supabase Storage probe: SUPABASE_URL normalization failed",
    );
    return;
  }

  let hostname = "";
  let isHttps = false;
  try {
    const u = new URL(normalized);
    hostname = u.hostname;
    isHttps = u.protocol === "https:";
  } catch {
    logger.warn("Supabase Storage probe: invalid URL after normalization");
    return;
  }

  const expectedProjectHost = /^[a-z0-9]+\.supabase\.co$/i.test(hostname);
  logger.info(
    {
      supabaseHostname: hostname,
      supabaseHttps: isHttps,
      expectedProjectApiHostPattern: "<project-ref>.supabase.co",
      hostnameMatchesProjectApiPattern: expectedProjectHost,
      notPoolerHost: !/pooler\.supabase\.com$/i.test(hostname),
    },
    "Supabase Storage env: URL shape (keys never logged)",
  );

  try {
    const dns = await import("node:dns/promises");
    const records = await dns.lookup(hostname, { all: true });
    logger.info(
      {
        dnsRecordCount: records.length,
        dnsAddresses: records.map((r) => ({
          address: r.address,
          family: r.family,
          ipVersion: r.family === 6 ? "IPv6" : "IPv4",
        })),
      },
      "DNS resolution for SUPABASE_URL host (IPv4 vs IPv6 hints for Railway)",
    );
  } catch (dnsErr) {
    logger.warn(
      { errorMessage: dnsErr instanceof Error ? dnsErr.message : String(dnsErr) },
      "DNS lookup failed for Supabase hostname",
    );
  }

  const storageListUrl = `${normalized.replace(/\/+$/, "")}/storage/v1/bucket`;
  logger.info(
    { storageListPath: "/storage/v1/bucket", storageListHostname: hostname },
    "Supabase Storage probe: issuing GET (same path the JS client uses for list buckets)",
  );

  try {
    const res = await fetch(storageListUrl, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const bodyText = await res.text();
    const preview = bodyText.length > 800 ? `${bodyText.slice(0, 800)}…` : bodyText;

    logger.info(
      {
        httpStatus: res.status,
        httpStatusText: res.statusText,
        ok: res.ok,
        responseBodyPreview: preview,
      },
      "Supabase Storage GET /storage/v1/bucket — raw HTTP result",
    );

    if (res.ok) {
      try {
        const parsed = JSON.parse(bodyText) as unknown;
        const buckets = Array.isArray(parsed) ? parsed : [];
        const names = buckets
          .map((b) => (b && typeof b === "object" && "name" in b ? String((b as { name?: string }).name) : ""))
          .filter(Boolean);
        const uploadsPresent = names.includes(UPLOADS_BUCKET);
        logger.info(
          {
            bucketCount: names.length,
            bucketNames: names,
            uploadsBucketExpected: UPLOADS_BUCKET,
            uploadsBucketExistsInList: uploadsPresent,
          },
          "Supabase Storage buckets from API (uploads bucket check)",
        );
      } catch {
        logger.warn("Supabase Storage probe: could not parse bucket list JSON");
      }
    }
  } catch (fetchErr) {
    const err = fetchErr as Error & { cause?: unknown };
    const causeMsg =
      err.cause instanceof Error
        ? err.cause.message
        : err.cause !== undefined
          ? String(err.cause)
          : undefined;
    logger.error(
      {
        probe: "GET /storage/v1/bucket",
        errorName: err.name,
        errorMessageFull: err.message,
        errorCause: causeMsg,
      },
      "Supabase Storage probe fetch failed (network/DNS/TLS — compare with DNS log above)",
    );
  }
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
        supabaseErrorMessageFull: msg,
        supabaseErrorStatusCode: (createError as { statusCode?: string })?.statusCode,
      },
      "Bucket preflight failed (network); attempting upload without listBuckets/create success",
    );
    return;
  }

  logger.error(
    {
      step: "createBucket",
      bucket: UPLOADS_BUCKET,
      supabaseErrorMessageFull: msg,
      supabaseErrorStatusCode: (createError as { statusCode?: string })?.statusCode,
    },
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
          supabaseErrorMessageFull: error.message,
          supabaseErrorStatusCode: (error as { statusCode?: string }).statusCode,
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
        supabaseErrorMessageFull: error.message,
        supabaseErrorStatusCode: (error as { statusCode?: string }).statusCode,
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

const CHAT_IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function extensionForChatImage(mimetype: string): string | null {
  const t = (mimetype || "").toLowerCase().split(";")[0]!.trim();
  return CHAT_IMAGE_EXT_BY_MIME[t] ?? null;
}

/**
 * True if `imageUrl` is a public URL for an object under `chat/{userId}/` in the configured uploads bucket.
 * يتحقق من المسار (pathname) وليس من سلسلة URL كاملة — يتفادى فشل المطابقة بين localhost و127.0.0.1 واختلاف الشرطة.
 */
export function isTrustedChatImagePublicUrlForUser(imageUrl: string, userId: number): boolean {
  const raw = imageUrl.trim();
  if (!raw) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  const expectedPathPrefix = `/storage/v1/object/public/${UPLOADS_BUCKET}/chat/${userId}/`;
  if (!parsed.pathname.startsWith(expectedPathPrefix)) {
    return false;
  }
  const rawProject = (process.env["SUPABASE_URL"] || "").trim();
  if (!rawProject) {
    return true;
  }
  let expectedHost: string;
  try {
    expectedHost = new URL(normalizeSupabaseProjectUrl(rawProject)).hostname.toLowerCase();
  } catch {
    return false;
  }
  const actualHost = parsed.hostname.toLowerCase();
  if (actualHost === expectedHost) {
    return true;
  }
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  return loopback.has(actualHost) && loopback.has(expectedHost);
}

export async function uploadChatImageForUser(
  userId: number,
  file: { buffer: Buffer; mimetype: string },
): Promise<string> {
  const ext = extensionForChatImage(file.mimetype);
  if (!ext) {
    throw new Error("نوع الصورة غير مدعوم");
  }
  if (!file.buffer?.length) {
    throw new Error("ملف الصورة فارغ أو تالف");
  }

  const supabase = getSupabaseStorageClient();
  await ensureUploadsBucketExists(supabase);

  const objectPath = `chat/${userId}/${crypto.randomUUID()}.${ext}`;
  let lastError: Error | null = null;
  let triedBucketRecovery = false;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.storage.from(UPLOADS_BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype || `image/${ext}`,
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
        supabaseErrorMessageFull: error.message,
        supabaseErrorStatusCode: (error as { statusCode?: string }).statusCode,
      },
      "Supabase storage upload failed for chat image",
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

    lastError = new Error(error.message || "Chat image upload failed");
    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw lastError ?? new Error("Chat image upload failed");
}

