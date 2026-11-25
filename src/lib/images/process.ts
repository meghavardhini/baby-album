import "server-only";

import sharp from "sharp";
import exifr from "exifr";
import heicConvert from "heic-convert";
import {
  DISPLAY_MAX_EDGE,
  DISPLAY_WEBP_QUALITY,
} from "@/config/app-config";

export type ProcessedImage = {
  /** EXIF capture time (ms since epoch) if present, else null. Brief §5.1 —
   *  album must flow chronologically; we fall back to upload order when null. */
  takenAt: number | null;
  /** Full-resolution pixel dimensions of the ORIGINAL (for the Phase 3
   *  print-resolution warning — brief §5). Oriented (EXIF rotation applied). */
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
  /** WebP display derivative bytes — downscaled, safe for browsers & cheap to
   *  serve. This is what the preview grid loads, never the original. */
  displayWebp: Buffer;
  displayContentType: "image/webp";
};

const HEIC_SIGNATURE_BRANDS = ["heic", "heix", "hevc", "heif", "mif1", "msf1"];

/** Detect HEIC/HEIF by the ISO-BMFF `ftyp` brand, not by the (often wrong or
 *  missing) client-reported mime type. */
function isHeic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buf.toString("ascii", 8, 12).toLowerCase();
  return HEIC_SIGNATURE_BRANDS.includes(brand);
}

/**
 * Turn an uploaded original (JPEG/PNG/WebP/HEIC) into:
 *   - its EXIF capture date,
 *   - its true oriented dimensions,
 *   - a web-friendly WebP derivative for display.
 *
 * HEIC is converted to JPEG first (browsers can't render HEIC — brief §13),
 * then handled like any other image. The original is never modified; the
 * caller keeps it in storage for print.
 *
 * Throws on corrupt/unreadable input (brief §13) so the caller can surface a
 * clear per-file error instead of silently dropping the photo.
 */
export async function processOriginal(input: Buffer): Promise<ProcessedImage> {
  // EXIF is read from the ORIGINAL bytes (works for HEIC too via exifr), before
  // any conversion, so the capture date survives.
  const takenAt = await readCaptureDate(input);

  let decodable = input;
  if (isHeic(input)) {
    const jpegArrayBuffer = await heicConvert({
      // heic-convert expects an ArrayBuffer
      buffer: input as unknown as ArrayBuffer,
      format: "JPEG",
      quality: 0.92,
    });
    decodable = Buffer.from(jpegArrayBuffer);
  }

  let image: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    image = sharp(decodable, { failOn: "error" }).rotate(); // apply EXIF orientation
    meta = await image.metadata();
  } catch (err) {
    throw new Error(
      `Unreadable or corrupt image: ${(err as Error).message ?? "unknown"}`,
    );
  }

  // After .rotate(), width/height reflect the visually-correct orientation.
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("Could not determine image dimensions.");
  }

  const orientation =
    width > height ? "landscape" : width < height ? "portrait" : "square";

  const displayWebp = await image
    .resize(DISPLAY_MAX_EDGE, DISPLAY_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: DISPLAY_WEBP_QUALITY })
    .toBuffer();

  return {
    takenAt,
    width,
    height,
    orientation,
    displayWebp,
    displayContentType: "image/webp",
  };
}

/** Read the best available EXIF capture timestamp. Returns ms epoch or null. */
async function readCaptureDate(buf: Buffer): Promise<number | null> {
  try {
    const exif = await exifr.parse(buf, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    });
    const d: Date | undefined =
      exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.ModifyDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.getTime();
    }
  } catch {
    // No/!unreadable EXIF — fall back to upload order (brief §5.1, §13).
  }
  return null;
}
