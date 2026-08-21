import { CheckCircle2, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { persistAuthUser } from "@/lib/auth-store";
import { Link } from "@/lib/navigation";
import { clearSupabaseAuthStorage, supabase } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const finishCheck = (ready: boolean) => {
      if (!mounted) return;
      setRecoveryReady(ready);
      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session?.user) finishCheck(true);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) finishCheck(false);
      else finishCheck(Boolean(data.session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async () => {
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      toast.error("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // End all existing refresh sessions after a recovery flow. The user signs
      // in again with the new password, which also clears stale local role data.
      await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
      clearSupabaseAuthStorage();
      persistAuthUser(null);
      toast.success("Password updated. Sign in with your new password.");
      navigate("/author/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password could not be updated.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      intent="reset"
      title="Choose a new password"
      subtitle="Open this page from the secure link in your reset email, then set a new password."
      footer={
        <Link to="/author/login" className="font-semibold text-[#FF3B30] underline">
          Back to sign in
        </Link>
      }
    >
      {checking ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#5F6368]">
          <Loader2 className="size-4 animate-spin" /> Verifying your reset link...
        </div>
      ) : !recoveryReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">This reset link is invalid or has expired.</p>
          <p className="mt-1">Request a fresh link and open the newest email from GamiBAR.</p>
          <Button asChild variant="outline" className="mt-4 rounded-xl bg-white">
            <Link to="/forgot-password">Request another link</Link>
          </Button>
        </div>
      ) : (
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void updatePassword();
          }}
        >
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmation}
            onChange={setConfirmation}
          />
          <p className="flex items-center gap-2 text-xs text-[#5F6368]">
            <CheckCircle2 className="size-4 text-emerald-600" /> Use 8 or more characters.
          </p>
          <Button type="submit" disabled={submitting} className={authPrimaryButtonClassName}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className={authLabelClassName}>
        {label}
      </Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#FF3B30]/70" />
        <Input
          id={id}
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={authFieldClassName}
          required
        />
      </div>
    </div>
  );
}
