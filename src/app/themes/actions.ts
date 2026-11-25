"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Create a fresh draft album for the signed-in user on the chosen theme, then
 * send them to its upload page. Reuses an existing empty draft on the same
 * theme if one is already open, so repeated clicks don't pile up drafts.
 */
export async function startAlbum(formData: FormData): Promise<void> {
  const themeId = String(formData.get("themeId") || "");
  if (!themeId) throw new Error("Missing theme.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Reuse an open draft on this theme if present.
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("theme_id", themeId)
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();

  let orderId = existing?.id as string | undefined;

  if (!orderId) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ user_id: user.id, theme_id: themeId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    orderId = data.id;
  }

  redirect(`/albums/${orderId}`);
}
