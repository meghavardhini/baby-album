/**
 * Central app config. Everything tunable lives here and reads from env, so no
 * magic numbers are hardcoded in logic (brief §2, §5, §14).
 */

/** Hard cap on how many photos a customer may upload for an album.
 *  TODO(brief §5/§14): this must eventually equal the chosen theme's total slot
 *  count, derived from the finished templates (~55–60). For Phase 1 it's a
 *  single configurable placeholder shared by all placeholder themes. */
export const UPLOAD_CAP: number = toInt(process.env.NEXT_PUBLIC_UPLOAD_CAP, 56);

/** Max accepted size per uploaded photo (brief §13 — reject/limit huge files). */
export const MAX_FILE_MB: number = toInt(process.env.NEXT_PUBLIC_MAX_FILE_MB, 25);
export const MAX_FILE_BYTES: number = MAX_FILE_MB * 1024 * 1024;

/** Longest edge (px) for the web-display derivative we serve in previews.
 *  Keeps preview bandwidth low — originals are kept untouched for print. */
export const DISPLAY_MAX_EDGE = 1600;

/** Quality for the WebP display derivative. */
export const DISPLAY_WEBP_QUALITY = 78;

/** Private storage bucket holding photos. */
export const PHOTO_BUCKET: string =
  process.env.NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET || "album-photos";

/** Accepted image mime types. HEIC/HEIF included (iPhone) — brief §13. */
export const ACCEPTED_MIME = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** Extensions we also accept when the browser reports an empty/odd mime for
 *  HEIC (common on some devices). */
export const ACCEPTED_EXT = new Set<string>([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
