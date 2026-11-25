import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { startAlbum } from "./actions";
import type { Theme } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const supabase = await createClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const list = (themes ?? []) as Theme[];

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-serif text-3xl text-ink">Choose a theme</h1>
        <p className="mt-2 max-w-2xl text-ink/70">
          Pick the look for your album. Each theme fits a set number of photos —
          you&apos;ll upload them on the next step.
        </p>

        {list.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dust bg-white p-6 text-ink/60">
            No themes yet. Run the Phase 1 database migration to seed the
            placeholder themes.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((theme) => (
              <div
                key={theme.id}
                className="overflow-hidden rounded-2xl border border-dust bg-white shadow-sm"
              >
                <div
                  className="flex h-40 items-center justify-center"
                  style={{ backgroundColor: theme.cover_color ?? "#E7DED1" }}
                >
                  <span className="font-serif text-2xl text-white drop-shadow">
                    {theme.name}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="font-serif text-xl text-ink">{theme.name}</h2>
                  <p className="mt-1 min-h-[3rem] text-sm text-ink/70">
                    {theme.description}
                  </p>
                  <p className="mt-2 text-xs text-ink/50">
                    Holds {theme.slot_count} photos
                  </p>
                  <form action={startAlbum} className="mt-4">
                    <input type="hidden" name="themeId" value={theme.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-clay px-4 py-2.5 font-medium text-white transition hover:bg-clay/90"
                    >
                      Start this album
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
