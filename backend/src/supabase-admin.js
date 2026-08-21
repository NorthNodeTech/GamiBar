import { createClient } from "@supabase/supabase-js";

import { HttpError } from "./http-error.js";

let adminClient;

export function createAdminClient() {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new HttpError("GamiBar backend is not configured.", 500);
  }
  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}

export async function checkSupabaseReadiness() {
  const signal = AbortSignal.timeout(4_000);
  const { error } = await createAdminClient()
    .from("gamibar_rooms")
    .select("id")
    .limit(1)
    .abortSignal(signal);
  if (error) throw new Error(error.message || "Database readiness check failed.");
}
