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
// Render's free web services can take close to a minute to wake after being idle.
// Keep the browser request alive long enough for that first request to complete.
const API_REQUEST_TIMEOUT_MS = 70_000;
let warmupPromise: Promise<void> | null = null;

function normalizeApiBaseUrl(value: string): string {
  let candidate = (value.split(",")[0] ?? "").trim().replace(/\/+$/, "");
  if (!candidate) return "";
  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(candidate)) candidate = `https://${candidate}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    console.error("[GamiBAR] VITE_API_BASE_URL is not a valid HTTP(S) URL.");
    return "";
  }
}

/**
 * Start a free-tier API cold start before the user submits a form or joins a room.
 * The promise is shared inside this browser tab so route transitions do not
 * duplicate its wake-up request.
 */
export function warmApi(): Promise<void> {
  if (!API_BASE_URL || typeof window === "undefined") return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  warmupPromise = fetch(`${API_BASE_URL}/api/health`, {
    headers: { accept: "application/json" },
    signal: controller.signal,
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => clearTimeout(timeout));
  return warmupPromise;
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
      throw new Error("GamiBar's server is still waking up. Wait a moment, then try again.");
    }
    throw new Error("Could not reach GamiBar's server. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as { error?: string } | T | null)
    : null;
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "GamiBar request failed.",
    );
  }
  if (payload === null) {
    throw new Error(
      "GamiBar's server returned an unexpected response. It may still be waking up; please retry.",
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
