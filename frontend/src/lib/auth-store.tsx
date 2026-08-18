import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UserRole = "student" | "author";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

const KEY = "gamibar.auth.v1";

/** Legacy guest identity for student join flows only. */
export const GUEST_STUDENT: AuthUser = {
  id: "guest-student",
  email: "student@guest.local",
  name: "Student",
  role: "student",
};

export function persistAuthUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(KEY);
    return;
  }
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function getStoredAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed.email || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAuthorAuthenticated(auth: AuthUser | null): auth is AuthUser {
  return Boolean(auth && auth.role === "author" && auth.id && !auth.id.startsWith("guest"));
}

const PUBLIC_AUTHOR_PATHS = new Set(["/author/login", "/author/register"]);

/** Normalize post-login redirect targets and block prerender/crawl loops. */
export function sanitizeAuthorRedirect(
  redirectTo: string | undefined,
  fallback = "/author/create",
): string {
  if (!redirectTo?.startsWith("/")) return fallback;
  const hashSplit = redirectTo.split("#")[0] ?? redirectTo;
  const [pathOnly, query] = hashSplit.split("?");
  const cleaned = (pathOnly ?? "").replace(/\/+$/, "") || "/";
  if (cleaned.includes("//") || PUBLIC_AUTHOR_PATHS.has(cleaned)) return fallback;
  const allowed = cleaned.startsWith("/author") || cleaned.startsWith("/join");
  if (!allowed) return fallback;
  return query ? `${cleaned}?${query}` : cleaned;
}

/** Account id to attach when joining a room as a signed-in user. */
export function getLinkedParticipantUserId(): string | undefined {
  const auth = getStoredAuth();
  if (!auth?.id || auth.id.startsWith("guest")) return undefined;
  return auth.id;
}

type AuthCtx = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthor: boolean;
  loading: boolean;
  login: (
    email: string,
    password: string,
    expectedRole?: UserRole,
  ) => Promise<
    { ok: true; role: UserRole } | { ok: false; error: string; needsEmailConfirmation?: boolean }
  >;
  registerAuthor: (
    name: string,
    email: string,
    password: string,
    redirectPath?: string,
  ) => Promise<
    | { ok: true; role: UserRole; needsEmailConfirmation?: boolean; message?: string }
    | { ok: false; error: string }
  >;
  requestPasswordReset: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resendSignupConfirmation: (
    email: string,
    redirectPath?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  /** Student join portal only - no Supabase account required. */
  enterAsGuest: (role: UserRole) => AuthUser;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({
  children,
  syncRemote = true,
}: {
  children: ReactNode;
  syncRemote?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    if (!syncRemote) {
      setUser(getStoredAuth());
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);

    const initializeAuth = async () => {
      const [{ isSupabaseConfigured, supabase }, { resolveAuthUserFromSession }] = await Promise.all([
        import("@/lib/supabase/client"),
        import("@/lib/supabase/auth"),
      ]);

      if (!mounted) return;
      if (!isSupabaseConfigured) {
        setUser(getStoredAuth());
        setLoading(false);
        return;
      }

      const syncSession = async () => {
        try {
          const resolved = await resolveAuthUserFromSession();
          if (!mounted) return;
          setUser(resolved);
          persistAuthUser(resolved);
        } catch {
          if (!mounted) return;
          setUser(getStoredAuth());
        } finally {
          if (mounted) setLoading(false);
        }
      };

      await syncSession();
      if (!mounted) return;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        void syncSession();
      });
      unsubscribe = () => subscription.unsubscribe();
    };

    void initializeAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [syncRemote]);

  const login = useCallback(async (email: string, password: string, expectedRole?: UserRole) => {
    const { signInWithPassword } = await import("@/lib/supabase/auth");
    const result = await signInWithPassword(email, password, expectedRole);
    if (!result.ok) return result;
    setUser(result.user);
    persistAuthUser(result.user);
    return { ok: true as const, role: result.user.role };
  }, []);

  const registerAuthor = useCallback(
    async (name: string, email: string, password: string, redirectPath?: string) => {
      const { signUpAuthor } = await import("@/lib/supabase/auth");
      const result = await signUpAuthor(name, email, password, redirectPath);
      if (!result.ok) return result;

      if (result.needsEmailConfirmation) {
        return {
          ok: true as const,
          role: "author" as const,
          needsEmailConfirmation: true,
          message: result.message,
        };
      }

      setUser(result.user);
      persistAuthUser(result.user);
      return { ok: true as const, role: result.user.role };
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    const { requestPasswordReset } = await import("@/lib/supabase/auth");
    return requestPasswordReset(email);
  }, []);

  const resendSignupConfirmation = useCallback(async (email: string, redirectPath?: string) => {
    const { resendAuthorSignupConfirmation } = await import("@/lib/supabase/auth");
    return resendAuthorSignupConfirmation(email, redirectPath);
  }, []);

  const logout = useCallback(async () => {
    const { signOutSupabase } = await import("@/lib/supabase/auth");
    await signOutSupabase();
    setUser(null);
    persistAuthUser(null);
  }, []);

  const enterAsGuest = useCallback((role: UserRole) => {
    if (role !== "student") {
      throw new Error("Author accounts must sign in.");
    }
    setUser(GUEST_STUDENT);
    persistAuthUser(GUEST_STUDENT);
    return GUEST_STUDENT;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthor: isAuthorAuthenticated(user),
      loading,
      login,
      registerAuthor,
      requestPasswordReset: resetPassword,
      resendSignupConfirmation,
      logout,
      enterAsGuest,
    }),
    [
      user,
      loading,
      login,
      registerAuthor,
      resetPassword,
      resendSignupConfirmation,
      logout,
      enterAsGuest,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useAuthSafe(): AuthCtx {
  const ctx = useContext(AuthContext);
  return (
    ctx ?? {
      user: null,
      isAuthenticated: false,
      isAuthor: false,
      loading: false,
      login: async () => ({ ok: false as const, error: "Auth unavailable." }),
      registerAuthor: async () => ({ ok: false as const, error: "Auth unavailable." }),
      requestPasswordReset: async () => ({ ok: false as const, error: "Auth unavailable." }),
      resendSignupConfirmation: async () => ({ ok: false as const, error: "Auth unavailable." }),
      logout: async () => {},
      enterAsGuest: () => GUEST_STUDENT,
    }
  );
}
