import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";
import { createClient } from "@supabase/supabase-js";

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
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
    ): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        if (!supabase) {
          throw new Error(
            "Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.",
          );
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
          throw new Error(uploadError.message || "Supabase upload failed");
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
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
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
