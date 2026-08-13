import type { User } from "@supabase/supabase-js";

import type { AuthUser, UserRole } from "@/lib/auth-store";
import { clearSupabaseAuthSession, supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type AuthorRow = Database["public"]["Tables"]["gamibar_authors"]["Row"];

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
  const { data, error } = await supabase
    .from("gamibar_authors")
    .select("id, display_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function resolveAuthUserFromSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
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
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: authorAuthRedirectUrl(redirectPath),
      data: {
        display_name: displayName.trim(),
        signup_role: "author",
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
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/author/login` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
