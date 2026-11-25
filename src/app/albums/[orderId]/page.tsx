import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Uploader } from "@/components/Uploader";
import { PhotoGrid } from "@/components/PhotoGrid";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/config/app-config";
import type { OrderPhoto, PhotoWithUrl, Theme } from "@/lib/types";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

export default async function AlbumPage({
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

  // RLS guarantees this only returns the user's own order.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, theme_id, themes ( * )")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();
  const theme = order.themes as unknown as Theme;
  const cap = theme?.slot_count ?? 0;

  const { data: photoRows } = await supabase
    .from("order_photos")
    .select("*")
    .eq("order_id", orderId)
    .order("taken_at", { ascending: true, nullsFirst: false })
    .order("upload_index", { ascending: true });

  const photos = (photoRows ?? []) as OrderPhoto[];

  // Sign the display derivatives for preview (never expose originals).
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

  const photosWithUrls: PhotoWithUrl[] = photos.map((p) => ({
    ...p,
    displayUrl: p.display_path ? (urlByPath.get(p.display_path) ?? null) : null,
  }));

  const count = photos.length;
  const remaining = Math.max(cap - count, 0);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <div>
            <Link href="/themes" className="text-sm text-clay underline">
              ← Themes
            </Link>
            <h1 className="mt-2 font-serif text-3xl text-ink">
              {theme?.name} album
            </h1>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl text-ink">
              {count} / {cap}
            </p>
            <p className="text-xs text-ink/50">photos uploaded</p>
          </div>
        </div>

        <p className="mt-2 max-w-2xl text-ink/70">
          Upload up to {cap} photos. They&apos;ll be arranged for you later —
          for now, add them and we&apos;ll sort everything by the date each
          photo was taken.
        </p>

        <div className="mt-8">
          <Uploader
            orderId={orderId}
            userId={user.id}
            bucket={PHOTO_BUCKET}
            cap={cap}
            existingCount={count}
          />
        </div>

        <div className="mt-10">
          <h2 className="font-serif text-xl text-ink">
            Your photos{" "}
            <span className="text-sm font-normal text-ink/50">
              (oldest first, by capture date)
            </span>
          </h2>
          <PhotoGrid photos={photosWithUrls} orderId={orderId} />
          {remaining > 0 && count > 0 && (
            <p className="mt-4 text-sm text-ink/50">
              {remaining} more {remaining === 1 ? "photo" : "photos"} can still
              be added.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
