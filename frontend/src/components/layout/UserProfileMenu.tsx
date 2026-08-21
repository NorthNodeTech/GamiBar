import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import {
  CreditCard,
  Crown,
  Gamepad2,
  HelpCircle,
  LogOut,
  Plus,
  QrCode,
  Radio,
  Sparkles,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSafe } from "@/lib/auth-store";
import { useQuery } from "@/lib/query";
import { fetchBillingStatus } from "@/lib/billing";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

type UserProfileMenuProps = {
  onUpgradeClick?: () => void;
};

export function UserProfileMenu({ onUpgradeClick }: UserProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthSafe();

  const statusQuery = useQuery({
    queryKey: ["billing-status", user?.id],
    enabled: Boolean(user?.id),
    queryFn: fetchBillingStatus,
  });

  const billingStatus = statusQuery.data;
  const isPro =
    billingStatus?.entitlement.status === "active" &&
    billingStatus?.entitlement.planCode !== "free";
  const planName = isPro ? (billingStatus?.currentPlan.shortName ?? "Pro") : "Free";

  const aiUsed = billingStatus?.usage.aiGenerationsThisMonth ?? 0;
  const aiLimit = billingStatus?.usage.aiGenerationsLimit ?? 20;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    clearAuthorRoom();
    navigate({ to: "/" });
  };

  const initial = (user?.name ?? "A").slice(0, 1).toUpperCase();

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="User account menu"
        className={cn(
          "flex items-center gap-2 rounded-xl border border-[#E7E9ED] bg-white p-1 transition-all duration-150 hover:border-[#CBD5E1] hover:bg-[#F8F9FB] focus:outline-none focus:ring-2 focus:ring-[#111111]/10 md:pr-3",
          open && "border-[#111111] bg-[#F8F9FB] shadow-xs",
        )}
      >
        <div className="relative grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#111111] to-[#2D3139] text-xs font-bold text-white shadow-xs md:size-8">
          {initial}
          {isPro && (
            <span
              title="GamiBar Pro Active"
              className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-amber-500 text-[8px] text-white shadow-xs ring-1 ring-white"
            >
              ★
            </span>
          )}
        </div>
        <div className="hidden flex-col text-left md:flex">
          <span className="max-w-[6.5rem] truncate text-xs font-bold text-[#111111] leading-tight">
            {user?.name ?? "Educator"}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold leading-tight",
              isPro ? "text-amber-600 font-bold" : "text-[#5F6368]",
            )}
          >
            {isPro ? "⚡ Pro Member" : "Free Plan"}
          </span>
        </div>
      </button>

      {/* Floating Popover Menu (ChatGPT style) */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-[#E7E9ED] bg-white p-2 text-[#111111] shadow-[0_16px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with User Info */}
          <div className="flex items-center gap-3 rounded-xl bg-[#F8F9FB] p-3 border border-[#EEF0F4]">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#111111] text-sm font-bold text-white shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-[#111111]">{user?.name ?? "Host"}</p>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    isPro
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : "bg-[#E5E7EB] text-[#4B5563]",
                  )}
                >
                  {planName}
                </span>
              </div>
              <p className="truncate text-xs text-[#5F6368] mt-0.5">{user?.email ?? ""}</p>
            </div>
          </div>

          {/* Upgrade Banner (if on Free plan) */}
          {!isPro && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-amber-600 animate-pulse" />
                  <span className="text-xs font-extrabold text-amber-950">
                    GamiBar Pro · ₹49/mo
                  </span>
                </div>
                <Link
                  to="/author/billing"
                  onClick={() => {
                    setOpen(false);
                    onUpgradeClick?.();
                  }}
                  className="rounded-lg bg-[#111111] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-transform hover:scale-105"
                >
                  Upgrade
                </Link>
              </div>
              <p className="text-[11px] text-amber-900/80 mt-1 leading-snug">
                Unlock 200 players, unlimited AI & extended QR drops.
              </p>
            </div>
          )}

          {/* AI Usage Tracker */}
          <div className="mt-2 px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#F0F2F5]">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold text-[#4B5563]">
                <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                AI Generation Credits
              </span>
              <span className="font-bold text-[#111111]">
                {isPro ? "Unlimited ⚡" : `${aiUsed} / ${aiLimit}`}
              </span>
            </div>
            {!isPro && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    aiUsed >= aiLimit
                      ? "bg-red-500"
                      : aiUsed >= 15
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${Math.min(100, (aiUsed / aiLimit) * 100)}%` }}
                />
              </div>
            )}
            {!isPro && aiUsed >= aiLimit && (
              <p className="mt-1 text-[10px] font-bold text-red-600">
                Monthly credits exhausted. Upgrade for unlimited AI!
              </p>
            )}
          </div>

          {/* Nav Items */}
          <div className="mt-2 space-y-0.5 border-t border-[#EEF0F4] pt-2 text-xs font-medium">
            <Link
              to="/author/billing"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111111] transition-colors"
            >
              <CreditCard className="size-4 text-[#6B7280]" />
              <span>Billing & Plans</span>
              {isPro && (
                <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </Link>

            <Link
              to="/author/sessions"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111111] transition-colors"
            >
              <Gamepad2 className="size-4 text-[#6B7280]" />
              <span>My Sessions</span>
            </Link>

            <Link
              to="/author/participated"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111111] transition-colors"
            >
              <Trophy className="size-4 text-[#6B7280]" />
              <span>Participated Games</span>
            </Link>

            <Link
              to="/qr-file"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111111] transition-colors"
            >
              <QrCode className="size-4 text-[#6B7280]" />
              <span>QRFile Instant Sharing</span>
            </Link>
          </div>

          {/* Logout Section */}
          <div className="mt-2 border-t border-[#EEF0F4] pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="size-4 text-red-600" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
