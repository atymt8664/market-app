/**
 * Decode-ahead cache for ad gallery images (P9).
 * Ensures the next slide is decoded in memory before opacity crossfade — avoids flash.
 */

const decodeCache = new Map<string, Promise<void>>();

function decodeImageElement(img: HTMLImageElement): Promise<void> {
  if (typeof img.decode === "function") {
    return img.decode().catch(() => undefined);
  }
  return Promise.resolve();
}

/**
 * Preload + decode a single image URL. Resolves even on network/decode failure
 * so the UI can still attempt to render (broken-image is better than infinite wait).
 */
export function preloadAdImage(src: string): Promise<void> {
  if (!src) return Promise.resolve();

  const cached = decodeCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";

    const finish = () => {
      void decodeImageElement(img).finally(resolve);
    };

    img.onload = finish;
    img.onerror = () => resolve();
    img.src = src;

    if (img.complete) finish();
  });

  decodeCache.set(src, promise);
  return promise;
}

/** Preload hero + adjacent slides for instant thumb/swipe navigation. */
export function preloadAdImageNeighbors(
  images: readonly string[],
  centerIndex: number,
): void {
  const count = images.length;
  if (count <= 0) return;

  const indices = new Set<number>([
    centerIndex,
    (centerIndex + 1) % count,
    (centerIndex - 1 + count) % count,
  ]);

  for (const i of indices) {
    const src = images[i];
    if (src) void preloadAdImage(src);
  }
}

/** Preload every slide URL (e.g. all hero variants ~50 KB each). */
export function preloadAdImageAll(images: readonly string[]): void {
  for (const src of images) {
    if (src) void preloadAdImage(src);
  }
}

/** Shallow compare for memoized gallery props. */
export function adImageListEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
