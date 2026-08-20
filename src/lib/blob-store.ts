import "server-only";
import { del } from "@vercel/blob";

export function isBlobConfigured() {
  return Boolean(
    process.env.BLOB_STORE_ID?.trim()
    || process.env.BLOB_READ_WRITE_TOKEN?.trim(),
  );
}

export async function deleteProductImages(urls: string[]) {
  if (!isBlobConfigured() || urls.length === 0) return;

  const blobUrls = urls.filter((url) => {
    try {
      return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
    } catch {
      return false;
    }
  });

  if (blobUrls.length > 0) await del(blobUrls);
}
