import { Link } from "@/lib/navigation";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
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
import { useAuthSafe } from "@/lib/auth-store";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuthSafe();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthShell
      intent="reset"
      title="Reset password"
      subtitle="Enter your email and we'll send you a secure link to reset your password."
      footer={
        <Link
          to="/author/login"
          className="inline-flex items-center gap-1.5 font-semibold text-[var(--gamibar-brand)] underline-offset-4 transition-colors hover:text-[var(--gamibar-brand-hover)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      }
    >
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const result = await requestPasswordReset(email);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("If an account exists, a reset link has been sent.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email" className={authLabelClassName}>
            Email address
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gamibar-brand)]/70" />
            <Input
              id="email"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClassName}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className={authPrimaryButtonClassName}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
