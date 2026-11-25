import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AlbumPreview } from "@/components/AlbumPreview";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/config/app-config";
import { getThemeTemplate } from "@/lib/engine/templates";
import { buildAlbum } from "@/lib/engine/layout";
import type { EnginePhoto, PhotoOrientation } from "@/lib/engine/types";
import type { OrderPhoto, Theme } from "@/lib/types";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 60 * 60;

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, theme_id, themes ( * )")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();
  const theme = order.themes as unknown as Theme;

  // Chronological order (EXIF date, then upload order) — same as the grid.
  const { data: photoRows } = await supabase
    .from("order_photos")
    .select("*")
    .eq("order_id", orderId)
    .order("taken_at", { ascending: true, nullsFirst: false })
    .order("upload_index", { ascending: true });

  const photos = (photoRows ?? []) as OrderPhoto[];

  // Sign display derivatives for preview.
  const displayPaths = photos
    .map((p) => p.display_path)
    .filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (displayPaths.length) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(displayPaths, SIGNED_URL_TTL);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const enginePhotos: EnginePhoto[] = photos.map((p) => ({
    id: p.id,
    orientation: (p.orientation as PhotoOrientation | null) ?? null,
    displayUrl: p.display_path ? (urlByPath.get(p.display_path) ?? null) : null,
    takenAt: p.taken_at,
    name: p.original_name,
  }));

  // Run the engine against the theme's (placeholder) template.
  const template = getThemeTemplate(theme.slug, theme.slot_count);
  const layout = buildAlbum(template, enginePhotos);

  const bgColor = theme.cover_color ?? "#7C8A6B";

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <div>
            <Link href={`/albums/${orderId}`} className="text-sm text-clay underline">
              ← Back to upload
            </Link>
            <h1 className="mt-2 font-serif text-3xl text-ink">
              {theme?.name} album — preview
            </h1>
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-ink/70">
          Your photos, arranged automatically into the theme&apos;s leaves and
          flowing oldest-first. The coloured backgrounds are placeholders — your
          themed artwork drops into these same layouts later.
        </p>

        {photos.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dust bg-white p-8 text-center text-ink/60">
            No photos yet.{" "}
            <Link href={`/albums/${orderId}`} className="text-clay underline">
              Add some
            </Link>{" "}
            to see your album come together.
          </p>
        ) : (
          <div className="mt-8">
            <AlbumPreview layout={layout} bgColor={bgColor} />
          </div>
        )}
      </main>
    </>
  );
}
