import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const projectRef = getSupabaseProjectRef(url);

export const SUPABASE_AUTH_STORAGE_KEY = `gamibar.supabase.${projectRef ?? "local"}.auth`;
const LEGACY_SUPABASE_AUTH_STORAGE_KEYS = projectRef ? [`sb-${projectRef}-auth-token`] : [];

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
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
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

function getSupabaseProjectRef(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

export function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") return;
  for (const key of [SUPABASE_AUTH_STORAGE_KEY, ...LEGACY_SUPABASE_AUTH_STORAGE_KEYS]) {
    window.localStorage.removeItem(key);
  }
}

export async function clearSupabaseAuthSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // If the refresh token is already rejected, direct storage cleanup is the recovery path.
  } finally {
    clearSupabaseAuthStorage();
  }
}
