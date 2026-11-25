"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client, scoped to the signed-in user. All reads/writes it
 * makes are governed by Row-Level Security, so a user can only ever touch
 * their own rows and their own storage folder.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
