import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell, authFieldClassName, authLabelClassName, authPrimaryButtonClassName } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredAuth, isAuthorAuthenticated, sanitizeAuthorRedirect, useAuth } from "@/lib/auth-store";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/author/login")({
  validateSearch: searchSchema,
  beforeLoad: () => {
    const auth = getStoredAuth();
    if (isAuthorAuthenticated(auth)) {
      throw redirect({ to: "/author" });
    }
  },
  head: () => ({
    meta: [{ title: "Sign in - GamiBAR" }],
  }),
  component: AuthorLoginPage,
});

function AuthorLoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = useSearch({ from: "/author/login" });
  const { login, resendSignupConfirmation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const destination = sanitizeAuthorRedirect(redirectTo);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Sign in to create live classroom sessions and host Quiz, Jigsaw, Connect Dots, or Target Hunt games."
      footer={
        <>
          New here?{" "}
          <Link
            to="/author/register"
            search={{ redirect: destination }}
            className="font-semibold text-[var(--gamibar-brand)] underline-offset-4 transition-colors hover:text-[var(--gamibar-brand-hover)] hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const result = await login(email, password, "author");
            if (!result.ok) {
              setNeedsEmailConfirmation(Boolean(result.needsEmailConfirmation));
              toast.error(result.error);
              return;
            }
            setNeedsEmailConfirmation(false);
            toast.success("Welcome back.");
            navigate({ to: destination });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email" className={authLabelClassName}>
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gamibar-brand)]/70" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClassName}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password" className={authLabelClassName}>
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--gamibar-brand)]"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gamibar-brand)]/70" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldClassName}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className={authPrimaryButtonClassName}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in & create rooms"
          )}
        </Button>

        {needsEmailConfirmation && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">Email confirmation required</p>
            <p className="mt-1 text-pretty text-amber-900/80 dark:text-amber-100/80">
              We sent a link to your inbox when you registered. Confirm it first, then sign in again.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={resending || !email.trim()}
              className="mt-3 h-10 w-full rounded-xl"
              onClick={async () => {
                setResending(true);
                try {
                  const result = await resendSignupConfirmation(email, destination);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Confirmation email sent. Check your inbox and spam folder.");
                } finally {
                  setResending(false);
                }
              }}
            >
              {resending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Resend confirmation email"
              )}
            </Button>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
