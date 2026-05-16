import sharp from "sharp";

/** Longest edge (px); images smaller are not enlarged. */
const AD_IMAGE_MAX_EDGE = 1920;
/** JPEG quality (1–100); balance size vs visible artifacts for marketplace photos. */
const AD_JPEG_QUALITY = 83;

/**
 * Resize (fit inside max edge), apply EXIF orientation, encode as JPEG for storage.
 * Used only for ad listing images before Supabase upload.
 */
export async function normalizeAdImageForUpload(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(AD_IMAGE_MAX_EDGE, AD_IMAGE_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: AD_JPEG_QUALITY,
      mozjpeg: true,
    })
    .toBuffer();
}
