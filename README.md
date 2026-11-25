# Baby Album — Phase 1 (Core intake)

Themed baby photo-album web app. **Phase 1** only: auth, theme picker, capped
upload to private storage, and an EXIF-date-sorted preview grid. No engine,
payments, or print-export yet (see `CLAUDE.md` for the full plan).

**Stack:** Next.js (App Router) + TypeScript · Supabase (Postgres + Auth +
Storage, hosted on AWS Mumbai) · magic-link auth · Sharp/exifr/heic-convert for
server-side image processing.

---

## What Phase 1 does

- **Magic-link sign-in** (passwordless). Unauthenticated users are redirected to `/login`.
- **Theme picker** (`/themes`) listing placeholder themes seeded in the DB.
- **Capped upload**: a configurable hard cap (per-theme `slot_count`, default 56).
  Photos upload **directly to a private bucket** (not through the API), then a
  server route reads EXIF, converts HEIC, builds a downscaled WebP preview, and
  records metadata.
- **Preview grid** sorted by **EXIF capture date** (oldest first), with each
  photo's date shown and a per-photo delete.
- **Privacy**: private bucket, per-user folder isolation enforced by RLS,
  previews served via short-lived signed URLs (never public, never the original).

---

## One-time setup

### 1. Create a Supabase project
- Region: **ap-south-1 (Mumbai)** for data residency.
- Grab the Project URL and the `anon` key from **Project Settings → API**.

### 2. Run the database migration
Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
This creates the tables, Row-Level-Security policies, the **private**
`album-photos` bucket + its storage policies, and seeds the placeholder themes.

> Confirm under **Storage** that the `album-photos` bucket shows as **Private**.

### 3. Turn on magic-link auth
- **Authentication → Providers → Email**: enable it, and enable
  "Email OTP / magic link" (passwords can stay off).
- **Authentication → URL Configuration**:
  - **Site URL**: `http://localhost:3000`
  - **Redirect URLs**: add `http://localhost:3000/auth/callback`
  - (add your deployed URLs here too when you deploy)

### 4. Configure environment
```bash
cp .env.local.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`. The `SUPABASE_SERVICE_ROLE_KEY`
is **not required for Phase 1** (processing runs as the signed-in user); leave
the placeholder — it's wired for later background jobs.

### 5. Install & run
```bash
npm install
npm run dev
```
Open http://localhost:3000.

---

## How to test it locally

1. **Sign in**: enter your email on `/login`, click the link Supabase emails you.
   (With default Supabase email, links go to the real inbox; the redirect URL
   from step 3 must be allowlisted or the link errors.)
2. **Pick a theme** on `/themes` → **Start this album**. This creates a draft
   order and opens its upload page.
3. **Upload photos** and watch the counter (`n / cap`). The grid fills in,
   **sorted oldest-first by capture date**.

### Deliberately test the messy cases (brief §13)
- **HEIC from an iPhone** → should display as a normal thumbnail (converted
  server-side) with its real capture date.
- **A huge file (>25MB)** → rejected with an "Over 25MB" label, nothing stored.
- **More files than the cap** → only the remaining slots are accepted, with a
  notice; the rest are ignored.
- **A corrupt/renamed non-image** (e.g. a `.txt` renamed to `.jpg`) → rejected
  as "couldn't be read as an image"; the orphaned upload is cleaned up.
- **A photo with no EXIF date** (e.g. a screenshot) → still uploads, shows
  "No date", and sorts after dated photos (falls back to upload order).

### What to check
- A second account cannot see the first account's photos or orders (RLS).
- Preview image URLs are time-limited signed URLs, not public links.
- Refreshing the album page keeps the chronological order stable.

---

## Project layout

```
src/
  config/app-config.ts          # cap, size limits, bucket — all env-driven
  lib/
    supabase/{client,server,admin}.ts
    images/process.ts           # EXIF read + HEIC convert + WebP derivative
    storage.ts  types.ts
  middleware.ts                 # session refresh + auth gating
  app/
    login/  auth/callback/      # magic-link flow
    themes/                     # theme picker + "start album" action
    albums/[orderId]/           # upload + preview grid + delete
    api/photos/process/route.ts # server-side processing
  components/                   # AppHeader, Uploader, PhotoGrid
supabase/migrations/0001_init.sql
```

See `CLAUDE.md` §15 for the decisions log and what's deferred to later phases.
