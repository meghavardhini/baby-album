import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processOriginal } from "@/lib/images/process";
import { displayPath } from "@/lib/storage";
import { PHOTO_BUCKET } from "@/config/app-config";
import type { Theme } from "@/lib/types";

// sharp / heic-convert / exifr are native/node-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  orderId?: string;
  photoId?: string;
  originalPath?: string;
  originalName?: string;
  byteSize?: number;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const { orderId, photoId, originalPath, originalName, byteSize } = body;

  if (!orderId || !photoId || !originalPath) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Defense in depth: the original must live in this user's own folder for
  // this order. (RLS already enforces it, but reject early and clearly.)
  if (!originalPath.startsWith(`${user.id}/${orderId}/`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  // Confirm the order is the user's, and read the theme's cap.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, themes ( slot_count )")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    await cleanup(supabase, originalPath);
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    await cleanup(supabase, originalPath);
    return NextResponse.json(
      { error: "This album is locked" },
      { status: 409 },
    );
  }

  const theme = order.themes as unknown as Pick<Theme, "slot_count">;
  const cap = theme?.slot_count ?? 0;

  // Enforce the hard cap server-side (the client also checks, but the server is
  // the source of truth). Count is also the next photo's upload_index.
  const { count } = await supabase
    .from("order_photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  const existing = count ?? 0;
  if (existing >= cap) {
    await cleanup(supabase, originalPath);
    return NextResponse.json({ error: "Album is full" }, { status: 409 });
  }

  // Download the uploaded original and process it.
  const { data: blob, error: dlErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .download(originalPath);

  if (dlErr || !blob) {
    return NextResponse.json(
      { error: "Could not read upload" },
      { status: 502 },
    );
  }

  const inputBuffer = Buffer.from(await blob.arrayBuffer());

  let processed;
  try {
    processed = await processOriginal(inputBuffer);
  } catch {
    // Corrupt/unreadable (brief §13). Remove the orphaned original and tell
    // the user plainly.
    await cleanup(supabase, originalPath);
    return NextResponse.json(
      { error: "This file couldn't be read as an image" },
      { status: 422 },
    );
  }

  // Store the display derivative.
  const dPath = displayPath(user.id, orderId, photoId);
  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(dPath, processed.displayWebp, {
      contentType: processed.displayContentType,
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json(
      { error: "Could not save preview" },
      { status: 502 },
    );
  }

  // Record the photo.
  const { error: insErr } = await supabase.from("order_photos").insert({
    id: photoId,
    order_id: orderId,
    user_id: user.id,
    original_path: originalPath,
    display_path: dPath,
    original_name: originalName ?? null,
    byte_size: byteSize ?? inputBuffer.byteLength,
    width: processed.width,
    height: processed.height,
    orientation: processed.orientation,
    taken_at: processed.takenAt ? new Date(processed.takenAt).toISOString() : null,
    upload_index: existing,
  });

  if (insErr) {
    await cleanup(supabase, originalPath, dPath);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: photoId });
}

async function cleanup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ...paths: string[]
) {
  const clean = paths.filter(Boolean);
  if (clean.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(clean).catch(() => {});
  }
}
