/** Shared domain types (brief §7 data model — Phase 1 subset). */

export type Theme = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_color: string | null;
  slot_count: number;
  is_active: boolean;
};

export type OrderStatus = "draft" | "paid" | "sent_to_print" | "shipped";

export type Order = {
  id: string;
  user_id: string;
  theme_id: string;
  status: OrderStatus;
  created_at: string;
};

export type OrderPhoto = {
  id: string;
  order_id: string;
  user_id: string;
  /** Storage path of the untouched original (kept for print). */
  original_path: string;
  /** Storage path of the WebP display derivative (served in previews). */
  display_path: string | null;
  original_name: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  orientation: "portrait" | "landscape" | "square" | null;
  /** EXIF capture time; null when the photo had no usable EXIF date. */
  taken_at: string | null;
  /** Upload sequence — the deterministic tiebreaker when taken_at is null or
   *  equal (brief §5.1: "fall back to file order"). */
  upload_index: number;
  created_at: string;
};

/** A photo joined with a short-lived signed URL for its display derivative. */
export type PhotoWithUrl = OrderPhoto & { displayUrl: string | null };
