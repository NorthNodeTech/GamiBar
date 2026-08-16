import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? ""
).replace(/\/$/, "");

type ApiFetchOptions = {
  method?: "GET" | "POST" | "DELETE";
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  body?: BodyInit;
  auth?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const endpoint = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const url = new URL(
    endpoint,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {};
  let body = options.body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  if (options.auth !== false) {
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "GamiBar request failed.",
    );
  }
  return payload as T;
}

export function apiPost<T>(path: string, json: unknown, auth = true): Promise<T> {
  return apiFetch<T>(path, { method: "POST", json, auth });
}
