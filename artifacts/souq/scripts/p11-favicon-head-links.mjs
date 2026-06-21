/**
 * P11/P13 — canonical favicon link tags (index.html + OG crawler HTML).
 * Single source to avoid drift between browser shell and Googlebot HTML.
 */
export const P11_FAVICON_HEAD_LINKS = [
  '<link rel="icon" href="/favicon.ico" sizes="48x48" />',
  '<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />',
  '<link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/icons/pwa-icon-192.png" />',
  '<link rel="apple-touch-icon" sizes="192x192" href="/icons/pwa-icon-192.png" />',
];

export function renderP11FaviconHeadLinks() {
  return P11_FAVICON_HEAD_LINKS.join("\n");
}

/** Wrap a PNG buffer in a single-image ICO container (PNG-in-ICO, Vista+). */
export function pngBufferToIco(pngBuffer, size = 48) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

export function isIcoFile(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 6 &&
    buffer.readUInt16LE(0) === 0 &&
    buffer.readUInt16LE(2) === 1 &&
    buffer.readUInt16LE(4) >= 1
  );
}
