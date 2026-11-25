-- ===========================================================================
-- Baby Album — Phase 1 schema, RLS, storage policies, placeholder themes.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) once per project.
-- Brief §7 (data model), §10 (privacy — private storage + per-user isolation).
-- ===========================================================================

-- ------- extensions --------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ------- themes ------------------------------------------------------------
-- Placeholder data for Phase 1 (brief: "themes can be placeholder data for now").
-- slot_count is the per-theme upload cap source of truth (brief §5/§14); for now
-- it mirrors NEXT_PUBLIC_UPLOAD_CAP until real templates fix it.
create table if not exists public.themes (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  cover_color text,                      -- simple swatch until real cover art
  slot_count  int  not null default 56,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ------- orders (a draft album) --------------------------------------------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  theme_id   uuid not null references public.themes (id),
  status     text not null default 'draft'
             check (status in ('draft','paid','sent_to_print','shipped')),
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);

-- ------- order_photos ------------------------------------------------------
create table if not exists public.order_photos (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  original_path text not null,           -- untouched original (for print)
  display_path  text,                    -- WebP derivative (for preview)
  original_name text,
  byte_size     bigint,
  width         int,                     -- oriented full-res dimensions
  height        int,
  orientation   text check (orientation in ('portrait','landscape','square')),
  taken_at      timestamptz,             -- EXIF capture date; null if absent
  upload_index  int not null default 0,  -- file-order tiebreaker (brief §5.1)
  created_at    timestamptz not null default now()
);
create index if not exists order_photos_order_idx on public.order_photos (order_id);
-- The album's chronological sort: EXIF date, then upload order as tiebreaker.
create index if not exists order_photos_chrono_idx
  on public.order_photos (order_id, taken_at nulls last, upload_index);

-- ===========================================================================
-- Row-Level Security — a user may only ever touch their own data.
-- ===========================================================================
alter table public.themes       enable row level security;
alter table public.orders       enable row level security;
alter table public.order_photos enable row level security;

-- themes: any signed-in user can read active themes; no client writes (admin
-- manages themes via the service role, which bypasses RLS).
drop policy if exists themes_read on public.themes;
create policy themes_read on public.themes
  for select to authenticated using (is_active);

-- orders: full CRUD scoped to the owner.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
  for delete to authenticated using (user_id = auth.uid());

-- order_photos: full CRUD scoped to the owner.
drop policy if exists photos_select on public.order_photos;
create policy photos_select on public.order_photos
  for select to authenticated using (user_id = auth.uid());

drop policy if exists photos_insert on public.order_photos;
create policy photos_insert on public.order_photos
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists photos_update on public.order_photos;
create policy photos_update on public.order_photos
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists photos_delete on public.order_photos;
create policy photos_delete on public.order_photos
  for delete to authenticated using (user_id = auth.uid());

-- ===========================================================================
-- Storage: private bucket + per-user folder isolation.
-- IMPORTANT: also create the bucket itself as PRIVATE (not public) in the
-- Supabase dashboard, or via:
--   insert into storage.buckets (id, name, public) values
--     ('album-photos','album-photos', false) on conflict do nothing;
-- Objects are stored under "{user_id}/..." so the first path segment is the
-- owner (brief §10 — private buckets, no public URLs).
-- ===========================================================================
insert into storage.buckets (id, name, public)
  values ('album-photos', 'album-photos', false)
  on conflict (id) do nothing;

drop policy if exists photos_bucket_read on storage.objects;
create policy photos_bucket_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'album-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photos_bucket_insert on storage.objects;
create policy photos_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'album-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photos_bucket_update on storage.objects;
create policy photos_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'album-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photos_bucket_delete on storage.objects;
create policy photos_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'album-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================================================
-- Placeholder themes (brief: placeholder data is fine for Phase 1).
-- ===========================================================================
insert into public.themes (slug, name, description, cover_color, slot_count)
values
  ('jungle',  'Jungle',  'Leafy greens, playful animals, a safari for your little explorer.', '#7C8A6B', 56),
  ('aquatic', 'Aquatic', 'Soft blues and gentle sea friends for a calm, dreamy album.',        '#5B8AA6', 56),
  ('cartoon', 'Cartoon', 'Bright, cheerful and fun — bold colour for big personalities.',      '#B8755A', 56)
on conflict (slug) do nothing;
