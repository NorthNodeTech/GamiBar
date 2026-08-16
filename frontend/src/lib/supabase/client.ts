import { createClient } from "@supabase/supabase-js";

type RuntimeEnv = Record<string, string | undefined>;

const viteEnv = ((import.meta as ImportMeta & { env?: RuntimeEnv }).env ?? {}) as RuntimeEnv;
const processEnv = ((globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }).process
  ?.env ?? {}) as RuntimeEnv;
const isBrowserRuntime = typeof window !== "undefined";

const url = viteEnv.VITE_SUPABASE_URL ?? processEnv.VITE_SUPABASE_URL ?? processEnv.SUPABASE_URL;
const anonKey = viteEnv.VITE_SUPABASE_ANON_KEY ?? processEnv.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = processEnv.SUPABASE_SERVICE_ROLE_KEY;
const serverKey = !isBrowserRuntime && serviceRoleKey ? serviceRoleKey : anonKey;
const projectRef = getSupabaseProjectRef(url);

export const SUPABASE_AUTH_STORAGE_KEY = `gamibar.supabase.${projectRef ?? "local"}.auth`;
const LEGACY_SUPABASE_AUTH_STORAGE_KEYS = projectRef ? [`sb-${projectRef}-auth-token`] : [];

if (isBrowserRuntime && (!url || !serverKey)) {
  console.warn(
    "[GamiBAR] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY - live rooms will not sync.",
  );
}

const resolvedUrl = url ?? "https://placeholder.supabase.co";
const resolvedAnonKey = anonKey ?? "placeholder-anon-key";
const resolvedServerKey = serverKey ?? resolvedAnonKey;

/** Browser Supabase client for auth/realtime; backend imports use the service role key. */
export const supabase = createClient(resolvedUrl, resolvedServerKey, {
  auth: {
    persistSession: isBrowserRuntime,
    autoRefreshToken: isBrowserRuntime,
    detectSessionInUrl: isBrowserRuntime,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});

/** Live game client. Browser uses anon; backend imports use the service role key. */
export const supabaseGame = createClient(
  resolvedUrl,
  isBrowserRuntime ? resolvedAnonKey : resolvedServerKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "gamibar-game",
    },
  },
);

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
