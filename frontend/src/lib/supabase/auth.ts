import type { User } from "@supabase/supabase-js";

import type { AuthUser, UserRole } from "@/lib/auth-store";
import { apiFetch } from "@/lib/api-client";
import {
  clearSupabaseAuthSession,
  clearSupabaseAuthStorage,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase/client";
type AuthorRow = { id: string; display_name: string; role: UserRole };
const SUPABASE_CONFIG_ERROR =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart the frontend dev server.";
const AUTH_REQUEST_TIMEOUT_MS = 8000;

class SupabaseAuthTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAuthTimeoutError";
  }
}

function authorAuthRedirectUrl(redirectPath = "/author/create") {
  if (typeof window === "undefined") return undefined;
  const safePath = redirectPath.startsWith("/author") ? redirectPath : "/author/create";
  return `${window.location.origin}/author/login?redirect=${encodeURIComponent(safePath)}`;
}

export function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Confirm your email before signing in. Check your inbox and spam folder, or resend the confirmation link below.";
  }
  return message;
}

export function isEmailNotConfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("email not confirmed") || lower.includes("email_not_confirmed");
}

function isRecoverableSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const lower = error.message.toLowerCase();
  return (
    lower.includes("invalid refresh token") ||
    lower.includes("refresh token not found") ||
    lower.includes("refresh token has been revoked") ||
    lower.includes("already used") ||
    lower.includes("auth session missing") ||
    lower.includes("session_not_found")
  );
}

export function mapProfileToAuthUser(user: User, profile: AuthorRow): AuthUser {
  return {
    id: profile.id,
    email: user.email ?? "",
    name: profile.display_name,
    role: profile.role,
  };
}

export async function fetchProfileForUser(userId: string) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_CONFIG_ERROR);
  // apiFetch owns the longer timeout required while a free Render service wakes.
  const { profile } = await apiFetch<{ profile: AuthorRow | null }>("/api/auth/profile");
  return profile?.id === userId ? profile : null;
}

export async function resolveAuthUserFromSession() {
  if (!isSupabaseConfigured) return null;

  const { data: sessionData, error: sessionError } = await withAuthTimeout(
    supabase.auth.getSession(),
    "Timed out while checking your sign-in session.",
  );
  if (sessionError) {
    if (isRecoverableSessionError(sessionError)) {
      await clearSupabaseAuthSession();
      return null;
    }
    throw new Error(sessionError.message);
  }

  const session = sessionData.session;
  if (!session?.user) return null;

  const profile = await fetchProfileForUser(session.user.id);
  if (!profile) return null;

  return mapProfileToAuthUser(session.user, profile);
}

export async function signInWithPassword(email: string, password: string, expectedRole?: UserRole) {
  if (!isSupabaseConfigured) {
    return { ok: false as const, error: SUPABASE_CONFIG_ERROR };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return {
      ok: false as const,
      error: formatAuthError(error.message),
      needsEmailConfirmation: isEmailNotConfirmedError(error.message),
    };
  }

  const profile = await fetchProfileForUser(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false as const, error: "Author account not found. Please contact support." };
  }

  if (expectedRole && profile.role !== expectedRole) {
    await supabase.auth.signOut();
    return {
      ok: false as const,
      error:
        expectedRole === "author"
          ? "This account is not an author account."
          : "This account is an author account. Sign in with GamiBAR.",
    };
  }

  return {
    ok: true as const,
    user: mapProfileToAuthUser(data.user, profile),
  };
}

export async function signUpAuthor(
  displayName: string,
  email: string,
  password: string,
  redirectPath = "/author/create",
) {
  if (!isSupabaseConfigured) {
    return { ok: false as const, error: SUPABASE_CONFIG_ERROR };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: authorAuthRedirectUrl(redirectPath),
      data: {
        display_name: displayName.trim(),
      },
    },
  });

  if (error) {
    return { ok: false as const, error: formatAuthError(error.message) };
  }

  if (!data.user) {
    return { ok: false as const, error: "Could not create account." };
  }

  if (!data.session) {
    const retry = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!retry.error && retry.data.user) {
      const profile = await fetchProfileForUser(retry.data.user.id);
      if (profile?.role === "author") {
        return {
          ok: true as const,
          needsEmailConfirmation: false as const,
          user: mapProfileToAuthUser(retry.data.user, profile),
        };
      }
      await supabase.auth.signOut();
    }

    return {
      ok: true as const,
      needsEmailConfirmation: true as const,
      message:
        "Account created. Open the confirmation link we emailed you, then return here to sign in.",
    };
  }

  const profile = await fetchProfileForUser(data.user.id);
  if (!profile || profile.role !== "author") {
    await supabase.auth.signOut();
    return { ok: false as const, error: "Author profile could not be created." };
  }

  return {
    ok: true as const,
    needsEmailConfirmation: false as const,
    user: mapProfileToAuthUser(data.user, profile),
  };
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured) {
    clearSupabaseAuthStorage();
    return;
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    if (isRecoverableSessionError(error)) {
      await clearSupabaseAuthSession();
      return;
    }
    throw new Error(error.message);
  }
}

export async function resendAuthorSignupConfirmation(
  email: string,
  redirectPath = "/author/create",
) {
  if (!isSupabaseConfigured) {
    return { ok: false as const, error: SUPABASE_CONFIG_ERROR };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: authorAuthRedirectUrl(redirectPath),
    },
  });

  if (error) {
    return { ok: false as const, error: formatAuthError(error.message) };
  }

  return { ok: true as const };
}

export async function requestPasswordReset(email: string) {
  if (!isSupabaseConfigured) {
    return { ok: false as const, error: SUPABASE_CONFIG_ERROR };
  }

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/update-password` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

async function withAuthTimeout<T>(request: PromiseLike<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new SupabaseAuthTimeoutError(message)),
      AUTH_REQUEST_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([Promise.resolve(request), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
