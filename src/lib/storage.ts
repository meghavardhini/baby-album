/**
 * Storage path conventions. Every object lives under the owning user's id as
 * the first path segment, which is exactly what the storage RLS policy keys on
 * (see supabase/migrations) — so a user can only read/write their own folder.
 *
 *   {userId}/{orderId}/original/{photoId}.{ext}
 *   {userId}/{orderId}/display/{photoId}.webp
 */

export function originalPath(
  userId: string,
  orderId: string,
  photoId: string,
  ext: string,
): string {
  return `${userId}/${orderId}/original/${photoId}.${ext.toLowerCase()}`;
}

export function displayPath(
  userId: string,
  orderId: string,
  photoId: string,
): string {
  return `${userId}/${orderId}/display/${photoId}.webp`;
}

/** Lowercased file extension without the dot, or "" if none. */
export function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}
