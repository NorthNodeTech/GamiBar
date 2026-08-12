import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[GamiBAR] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY - live rooms will not sync.",
  );
}

/** Browser Supabase client for auth, author dashboard, and profile flows. */
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Live game reads/writes always use anon RLS policies.
 * Keeps classroom play working even when an author session JWT is expired.
 */
export const supabaseGame = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "gamibar-game",
  },
});
