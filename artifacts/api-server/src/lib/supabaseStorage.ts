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

function getSupabaseStorageClient(): SupabaseClient {
  const url = (process.env["SUPABASE_URL"] || "").trim();
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

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureUploadsBucketExists(supabase: SupabaseClient): Promise<void> {
  if (uploadsBucketEnsured) return;

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    logger.error(
      { step: "listBuckets", message: listError.message, bucket: UPLOADS_BUCKET },
      "Supabase storage listBuckets failed",
    );
    throw new Error(`Failed to read storage buckets: ${listError.message}`);
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === UPLOADS_BUCKET);
  if (!exists) {
    logger.info({ bucket: UPLOADS_BUCKET }, "Creating Supabase storage bucket");
    const { error: createError } = await supabase.storage.createBucket(UPLOADS_BUCKET, {
      public: true,
    });
    if (createError && !/already exists/i.test(createError.message ?? "")) {
      logger.error(
        {
          step: "createBucket",
          message: createError.message,
          bucket: UPLOADS_BUCKET,
        },
        "Supabase storage createBucket failed",
      );
      throw new Error(`Failed to create uploads bucket: ${createError.message}`);
    }
  }

  uploadsBucketEnsured = true;
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

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
      const { error } = await supabase.storage.from(UPLOADS_BUCKET).upload(objectPath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

      if (!error) {
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

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (!error) {
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
    lastError = new Error(error.message || "Avatar upload failed");
    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw lastError ?? new Error("Avatar upload failed");
}

