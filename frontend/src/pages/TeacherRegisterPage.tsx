import { Link, useNavigate, useSearch } from "@/lib/navigation";
import { Loader2, Lock, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AuthShell,
  authFieldClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
} from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getStoredAuth,
  isAuthorAuthenticated,
  sanitizeAuthorRedirect,
  useAuth,
} from "@/lib/auth-store";

export default function AuthorRegisterPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = useSearch({ from: "/author/register" });
  const { registerAuthor } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destination = sanitizeAuthorRedirect(redirectTo);

  return (
    <AuthShell
      intent="register"
      title="Create account"
      subtitle="Create your host account and start making sessions interactive."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/author/login"
            search={{ redirect: destination }}
            className="font-semibold text-[var(--gamibar-brand)] underline-offset-4 transition-colors hover:text-[var(--gamibar-brand-hover)] hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
          }
          setSubmitting(true);
          try {
            const result = await registerAuthor(name, email, password, destination);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            if (result.needsEmailConfirmation) {
              toast.success(result.message ?? "Check your email to confirm your account.");
              navigate({ to: "/author/login", search: { redirect: destination } });
              return;
            }
            toast.success("Account created.");
            navigate({ to: destination });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="name" className={authLabelClassName}>
            Display name
          </Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gamibar-brand)]/70" />
            <Input
              id="name"
              autoComplete="name"
              placeholder="Ms. Patel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authFieldClassName}
              required
            />
          </div>
        </div>

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
          <Label htmlFor="password" className={authLabelClassName}>
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gamibar-brand)]/70" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldClassName}
              minLength={8}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className={authPrimaryButtonClassName}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
