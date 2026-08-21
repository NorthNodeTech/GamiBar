import { createClient } from "@supabase/supabase-js";

type RuntimeEnv = Record<string, string | undefined>;

const viteEnv = ((import.meta as ImportMeta & { env?: RuntimeEnv }).env ?? {}) as RuntimeEnv;
const isBrowserRuntime = typeof window !== "undefined";

const url = readEnvValue(viteEnv.VITE_SUPABASE_URL);
const anonKey = readEnvValue(viteEnv.VITE_SUPABASE_ANON_KEY);
const projectRef = getSupabaseProjectRef(url);

export const SUPABASE_AUTH_STORAGE_KEY = `gamibar.supabase.${projectRef ?? "local"}.auth`;
const LEGACY_SUPABASE_AUTH_STORAGE_KEYS = projectRef ? [`sb-${projectRef}-auth-token`] : [];
export const isSupabaseConfigured = Boolean(
  url && anonKey && !isPlaceholderConfigValue(url) && !isPlaceholderConfigValue(anonKey),
);

if (isBrowserRuntime && !isSupabaseConfigured) {
  console.warn(
    "[GamiBAR] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY - live rooms will not sync.",
  );
}

const resolvedUrl = url ?? "http://127.0.0.1:54321";
const resolvedAnonKey = anonKey ?? "missing-anon-key";

/** Browser-only Supabase client. Privileged database work belongs to Express. */
export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
    persistSession: isBrowserRuntime,
    autoRefreshToken: isBrowserRuntime,
    detectSessionInUrl: isBrowserRuntime,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});

/** Anonymous Realtime Broadcast client; room data is fetched from Express. */
export const supabaseGame = createClient(resolvedUrl, resolvedAnonKey, {
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

function readEnvValue(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function isPlaceholderConfigValue(value: string): boolean {
  return /placeholder|your_|example|localhost\.supabase/i.test(value);
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
