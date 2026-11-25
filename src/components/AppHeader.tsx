import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-dust bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/themes" className="font-serif text-xl text-ink">
          Baby Album
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user?.email && (
            <span className="hidden text-ink/60 sm:inline">{user.email}</span>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-dust px-3 py-1.5 text-ink/80 transition hover:bg-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
