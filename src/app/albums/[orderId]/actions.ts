"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/config/app-config";

/** Delete one of the user's own photos (original + derivative + row). */
export async function deletePhoto(formData: FormData): Promise<void> {
  const photoId = String(formData.get("photoId") || "");
  const orderId = String(formData.get("orderId") || "");
  if (!photoId || !orderId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS ensures we can only read our own photo.
  const { data: photo } = await supabase
    .from("order_photos")
    .select("id, original_path, display_path")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return;

  const paths = [photo.original_path, photo.display_path].filter(
    (p): p is string => Boolean(p),
  );
  if (paths.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }
  await supabase.from("order_photos").delete().eq("id", photoId);

  revalidatePath(`/albums/${orderId}`);
}
