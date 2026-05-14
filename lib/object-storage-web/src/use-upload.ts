import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";
import { createClient } from "@supabase/supabase-js";
import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    /** When set (e.g. on Vercel), browser `fetch` must target this host for `/api/*` (session cookies + uploads). */
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/** Bound how long browser waits for API multipart uploads (local proxy / slow disk). */
const API_UPLOAD_FETCH_MS = 120_000;

/** Same rules as souq `getApiBaseUrl` / `apiUrl`: absolute URL when `VITE_API_BASE_URL` is set. */
function resolveApiFetchUrl(path: string): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string" || !raw.trim()) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const base = raw.trim().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  publicUrl: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

interface UploadFileOptions {
  folder?: "ads" | "avatars" | "misc";
  userId?: string | number;
  fileExtension?: string;
}

export class UploadFailureError extends Error {
  readonly statusCode?: number;
  readonly status?: number;
  readonly bucket: string;
  readonly path?: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly causeName?: string;

  constructor(params: {
    message: string;
    statusCode?: number;
    status?: number;
    bucket: string;
    path?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    causeName?: string;
  }) {
    super(params.message);
    Object.setPrototypeOf(this, UploadFailureError.prototype);
    this.name = "UploadFailureError";
    this.statusCode = params.statusCode;
    this.status = params.status;
    this.bucket = params.bucket;
    this.path = params.path;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.fileSize = params.fileSize;
    this.causeName = params.causeName;
  }
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * This hook implements the two-step presigned URL upload flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { uploadFile, isUploading, error } = useUpload({
 *     onSuccess: (response) => {
 *       console.log("Uploaded to:", response.objectPath);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined;
  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null;
  const uploadsBucket = "uploads";
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const buildPublicObjectUrl = useCallback(
    (objectPath: string): string => {
      if (supabase) {
        const { data } = supabase.storage.from(uploadsBucket).getPublicUrl(objectPath);
        if (data?.publicUrl) return data.publicUrl;
      }
      if (!supabaseUrl) {
        throw new Error("Missing VITE_SUPABASE_URL for public URL generation");
      }
      const encodedPath = objectPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${uploadsBucket}/${encodedPath}`;
    },
    [supabase, supabaseUrl],
  );

  const buildUploadPath = useCallback(
    (file: File, uploadOptions?: UploadFileOptions): string => {
      const folder = uploadOptions?.folder ?? "misc";
      const extension = uploadOptions?.fileExtension ?? "jpg";
      const fileId = crypto.randomUUID();
      if (folder === "ads") {
        if (!uploadOptions?.userId) {
          throw new Error("Missing user ID for ad image upload");
        }
        return `ads/${uploadOptions.userId}/${fileId}.${extension}`;
      }
      return `${folder}/${fileId}.${extension}`;
    },
    [],
  );

  const uploadFile = useCallback(
    async (
      file: File,
      uploadOptions?: UploadFileOptions,
    ): Promise<UploadResponse> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const folder = uploadOptions?.folder ?? "misc";

        /** Ad + avatar uploads use the API with service role — avoids Storage RLS rejecting anon inserts. */
        if (folder === "ads") {
          if (uploadOptions?.userId === undefined || uploadOptions?.userId === null) {
            throw new UploadFailureError({
              message: "Missing user ID for ad image upload",
              bucket: uploadsBucket,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
            });
          }
          setProgress(20);
          const formData = new FormData();
          formData.append("images", file);
          const uploadUrl = resolveApiFetchUrl("/api/storage/uploads/ad-images");
          const viteDev = Boolean((import.meta.env as { DEV?: boolean }).DEV);
          if (viteDev) {
            try {
              const u = new URL(uploadUrl, "http://localhost");
              // eslint-disable-next-line no-console -- ad-images upload diagnostics (dev only)
              console.log("[use-upload] POST ad-images", {
                path: "/api/storage/uploads/ad-images",
                apiHost: u.hostname,
                https: u.protocol === "https:",
              });
            } catch {
              // eslint-disable-next-line no-console
              console.log("[use-upload] POST ad-images", {
                uploadUrl: uploadUrl.slice(0, 80),
              });
            }
          }
          const csrf = getAuthProfileCsrfTokenForRequest();
          const uploadHeaders =
            typeof csrf === "string" && csrf.length >= 32
              ? { "X-CSRF-Token": csrf }
              : undefined;
          const res = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
            credentials: "include",
            headers: uploadHeaders,
            signal: AbortSignal.timeout(API_UPLOAD_FETCH_MS),
          });
          const payload = (await res.json().catch(() => ({}))) as {
            error?: string;
            imageUrls?: string[];
          };
          if (!res.ok) {
            throw new UploadFailureError({
              message:
                typeof payload.error === "string"
                  ? payload.error
                  : res.statusText || "Upload failed",
              statusCode: res.status,
              status: res.status,
              bucket: uploadsBucket,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
            });
          }
          const publicUrl = payload.imageUrls?.[0];
          if (!publicUrl) {
            throw new UploadFailureError({
              message: "لم يُعَد رابط الصورة من الخادم",
              bucket: uploadsBucket,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
            });
          }
          const uploadResponse: UploadResponse = {
            uploadURL: publicUrl,
            publicUrl,
            objectPath: "",
            metadata: {
              name: file.name,
              size: file.size,
              contentType: file.type || "application/octet-stream",
            },
          };
          setProgress(100);
          options.onSuccess?.(uploadResponse);
          return uploadResponse;
        }

        if (folder === "avatars") {
          setProgress(20);
          const formData = new FormData();
          formData.append("image", file);
          const avatarUrl = resolveApiFetchUrl("/api/users/upload-avatar");
          const csrf = getAuthProfileCsrfTokenForRequest();
          const uploadHeaders =
            typeof csrf === "string" && csrf.length >= 32
              ? { "X-CSRF-Token": csrf }
              : undefined;
          const res = await fetch(avatarUrl, {
            method: "POST",
            body: formData,
            credentials: "include",
            headers: uploadHeaders,
            signal: AbortSignal.timeout(API_UPLOAD_FETCH_MS),
          });
          const payload = (await res.json().catch(() => ({}))) as {
            error?: string;
            imageUrl?: string;
          };
          if (!res.ok) {
            throw new UploadFailureError({
              message:
                typeof payload.error === "string"
                  ? payload.error
                  : res.statusText || "Upload failed",
              statusCode: res.status,
              status: res.status,
              bucket: uploadsBucket,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
            });
          }
          const publicUrl = payload.imageUrl;
          if (!publicUrl) {
            throw new UploadFailureError({
              message: "لم يُعَد رابط الصورة من الخادم",
              bucket: uploadsBucket,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
            });
          }
          const uploadResponse: UploadResponse = {
            uploadURL: publicUrl,
            publicUrl,
            objectPath: "",
            metadata: {
              name: file.name,
              size: file.size,
              contentType: file.type || "application/octet-stream",
            },
          };
          setProgress(100);
          options.onSuccess?.(uploadResponse);
          return uploadResponse;
        }

        if (!supabase) {
          throw new UploadFailureError({
            message:
              "Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.",
            bucket: uploadsBucket,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
          });
        }

        setProgress(10);
        const objectPath = buildUploadPath(file, uploadOptions);

        setProgress(30);
        const { error: uploadError } = await supabase.storage
          .from(uploadsBucket)
          .upload(objectPath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          throw new UploadFailureError({
            message: uploadError.message || "Supabase upload failed",
            statusCode: (uploadError as { statusCode?: number }).statusCode,
            status: (uploadError as { status?: number }).status,
            bucket: uploadsBucket,
            path: objectPath,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            causeName: uploadError.name,
          });
        }

        const { data: publicUrlData } = supabase.storage
          .from(uploadsBucket)
          .getPublicUrl(objectPath);

        const uploadResponse: UploadResponse = {
          uploadURL: publicUrlData.publicUrl,
          publicUrl: publicUrlData.publicUrl,
          objectPath,
          metadata: {
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          },
        };

        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const error =
          err instanceof UploadFailureError
            ? err
            : new UploadFailureError({
                message:
                  err instanceof Error ? err.message : "Upload failed",
                bucket: uploadsBucket,
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
                fileSize: file.size,
                causeName: err instanceof Error ? err.name : undefined,
              });
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [buildUploadPath, options, supabase]
  );

  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.",
        );
      }
      const objectPath = buildUploadPath({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      } as File);
      const { data, error: signedError } = await supabase.storage
        .from(uploadsBucket)
        .createSignedUploadUrl(objectPath);
      if (signedError) {
        throw new Error(signedError.message || "Failed to get signed upload URL");
      }
      return {
        method: "PUT",
        url: data.signedUrl,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    [buildUploadPath, supabase]
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}
