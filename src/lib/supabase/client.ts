import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[GamiBAR] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY - live rooms will not sync.",
  );
}

/** Browser Supabase client for static SPA (anon key only). */
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
