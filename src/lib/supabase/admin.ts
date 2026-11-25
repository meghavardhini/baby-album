import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY admin client using the service-role key. Bypasses Row-Level
 * Security, so it must never be imported into client code (the `server-only`
 * import above makes that a build error).
 *
 * Used by the image-processing route to read a user's uploaded original and
 * write back its display derivative + metadata row. Every caller MUST first
 * verify, with the user-scoped client, that the order being processed belongs
 * to the signed-in user before using this.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
