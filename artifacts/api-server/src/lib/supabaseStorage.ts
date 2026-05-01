import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const UPLOADS_BUCKET = process.env["SUPABASE_UPLOADS_BUCKET"] || "uploads";
const MAX_UPLOAD_ATTEMPTS = 3;
let uploadsBucketEnsured = false;

export class MissingSupabaseStorageConfigError extends Error {
  constructor(public readonly missingEnvVar: string) {
    super(`Missing required Supabase storage env var: ${missingEnvVar}`);
    this.name = "MissingSupabaseStorageConfigError";
    Object.setPrototypeOf(this, MissingSupabaseStorageConfigError.prototype);
  }
}

function getSupabaseStorageClient(): SupabaseClient {
  const url = process.env["SUPABASE_URL"] || "";
  if (!url) {
    throw new MissingSupabaseStorageConfigError("SUPABASE_URL");
  }
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
  if (!serviceRoleKey) {
    throw new MissingSupabaseStorageConfigError("SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureUploadsBucketExists(supabase: SupabaseClient): Promise<void> {
  if (uploadsBucketEnsured) return;

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to read storage buckets: ${listError.message}`);
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === UPLOADS_BUCKET);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(UPLOADS_BUCKET, {
      public: true,
    });
    if (createError && !/already exists/i.test(createError.message ?? "")) {
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

    lastError = new Error(error.message || "Avatar upload failed");
    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw lastError ?? new Error("Avatar upload failed");
}

