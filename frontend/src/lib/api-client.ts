import { supabase } from "@/lib/supabase/client";

const isDev =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.DEV === true;

const rawApiBaseUrl =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? "";

// In development, default to relative path `/api` to use Vite proxy, unless rawApiBaseUrl is explicitly set to a custom host.
const API_BASE_URL =
  isDev && (!rawApiBaseUrl || rawApiBaseUrl.includes("onrender.com"))
    ? ""
    : normalizeApiBaseUrl(rawApiBaseUrl);

const AUTH_SESSION_TIMEOUT_MS = 8000;
const API_REQUEST_TIMEOUT_MS = 15000;

function normalizeApiBaseUrl(value: string): string {
  return (value.split(",")[0] ?? "").trim().replace(/\/+$/, "");
}

type ApiFetchOptions = {
  method?: "GET" | "POST" | "DELETE";
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  body?: BodyInit;
  auth?: boolean;
  timeoutMs?: number;
};

class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

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
    const { data } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_SESSION_TIMEOUT_MS,
      "Timed out while checking your sign-in session. Refresh and try again.",
    ).catch((error) => {
      if (error instanceof RequestTimeoutError) throw error;
      return { data: { session: null } };
    });
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? API_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("GamiBar API took too long to respond. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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

async function withTimeout<T>(
  request: PromiseLike<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new RequestTimeoutError(message)), timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(request), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
