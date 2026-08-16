import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { cn } from "@/lib/utils";

export function GoogleSignInButton({
  onClick,
  disabled,
  label = "Sign in with Google",
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f8f9fa] active:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <GoogleIcon className="size-5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
