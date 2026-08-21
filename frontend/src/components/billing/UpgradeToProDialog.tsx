import { useState } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { Check, Crown, Loader2, Lock, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BILLING_PLANS, type PaidBillingPlanCode } from "@shared/billing/plans";
import {
  createBillingCheckout,
  fetchBillingStatus,
  openRazorpayCheckout,
  verifyBillingCheckout,
} from "@/lib/billing";
import { useAuthSafe } from "@/lib/auth-store";
import { useQueryClient } from "@/lib/query";
import { cn } from "@/lib/utils";

type UpgradeToProDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureTitle?: string;
  featureDescription?: string;
};

export function UpgradeToProDialog({
  open,
  onOpenChange,
  featureTitle = "Unlock GamiBar Pro",
  featureDescription = "Get unlimited AI generations, 200 live players per session, and 28-day QRFile retention.",
}: UpgradeToProDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthSafe();
  const [selectedPlan, setSelectedPlan] = useState<PaidBillingPlanCode>("pro_yearly");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleCheckout = async (planCode: PaidBillingPlanCode) => {
    if (!user) {
      toast.error("Sign in to upgrade your account.");
      navigate({ to: "/author/login" });
      return;
    }

    setBusy(true);
    try {
      // 1. Create Checkout
      const { checkout } = await createBillingCheckout(planCode, {
        legalName: user.name ?? "GamiBar Host",
        email: user.email ?? "",
        stateCode: "KA",
      });

      // 2. Open Razorpay Modal
      const razorpayResult = await openRazorpayCheckout(checkout);

      // 3. Verify on server
      await verifyBillingCheckout(planCode, razorpayResult);

      toast.success("Welcome to GamiBar Pro! Unlimited features unlocked.");
      await queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment was not completed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const plans: Array<{
    code: PaidBillingPlanCode;
    name: string;
    price: string;
    period: string;
    badge?: string;
    highlight?: boolean;
    savings?: string;
  }> = [
    {
      code: "pro_monthly",
      name: "Monthly",
      price: "₹49",
      period: "/ month",
      savings: "Flexible monthly billing",
    },
    {
      code: "pro_yearly",
      name: "Yearly",
      price: "₹499",
      period: "/ year",
      badge: "Save 15% · Best Value",
      highlight: true,
      savings: "2 Months Free (₹41.5/mo)",
    },
    {
      code: "lifetime",
      name: "Lifetime Access",
      price: "₹1,999",
      period: "one-time",
      badge: "Pay Once Forever",
      savings: "Zero renewals ever",
    },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl border border-[#E7E9ED] bg-white p-6 sm:p-8 text-[#111111] shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] transition-colors"
          aria-label="Close upgrade dialog"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-md mx-auto">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <Sparkles className="size-6" />
          </div>
          <h2 className="mt-3 font-display text-2xl font-black text-[#111111]">{featureTitle}</h2>
          <p className="mt-1 text-xs text-[#5F6368] leading-relaxed">{featureDescription}</p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F8F9FB] p-3 text-xs border border-[#EEF0F4]">
          <div className="flex items-center gap-2 font-medium text-[#374151]">
            <Check className="size-4 text-emerald-600 shrink-0 font-bold" />
            <span>⚡ Unlimited Active Rooms</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-[#374151]">
            <Check className="size-4 text-emerald-600 shrink-0 font-bold" />
            <span>⚡ Unlimited AI Generations</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-[#374151]">
            <Check className="size-4 text-emerald-600 shrink-0 font-bold" />
            <span>👥 Up to 200 Live Players</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-[#374151]">
            <Check className="size-4 text-emerald-600 shrink-0 font-bold" />
            <span>📁 28-day QRFile Retention</span>
          </div>
        </div>

        {/* Plan Cards Selector */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setSelectedPlan(p.code)}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150",
                  isSelected
                    ? "border-[#111111] bg-[#111111] text-white shadow-md"
                    : "border-[#E7E9ED] bg-white text-[#111111] hover:border-[#CBD5E1] hover:bg-[#F8F9FB]",
                )}
              >
                {p.badge && (
                  <span
                    className={cn(
                      "absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                      isSelected
                        ? "bg-amber-400 text-black shadow-xs"
                        : "bg-amber-100 text-amber-900 border border-amber-200",
                    )}
                  >
                    {p.badge}
                  </span>
                )}

                <div>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      isSelected ? "text-gray-300" : "text-[#5F6368]",
                    )}
                  >
                    {p.name}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-2xl font-black">{p.price}</span>
                    <span
                      className={cn("text-[10px]", isSelected ? "text-gray-300" : "text-[#5F6368]")}
                    >
                      {p.period}
                    </span>
                  </div>
                </div>

                <p
                  className={cn(
                    "mt-2 text-[10px] font-semibold",
                    isSelected ? "text-amber-300" : "text-[#5F6368]",
                  )}
                >
                  {p.savings}
                </p>
              </button>
            );
          })}
        </div>

        {/* Direct Razorpay Checkout Action */}
        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => handleCheckout(selectedPlan)}
            className="h-12 w-full rounded-2xl bg-[#FF3B30] text-sm font-extrabold text-white shadow-lg hover:bg-[#E6332B] transition-transform active:scale-[0.99]"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Connecting to Razorpay...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Upgrade to Pro ·{" "}
                {selectedPlan === "pro_monthly"
                  ? "₹49/mo"
                  : selectedPlan === "pro_yearly"
                    ? "₹499/yr"
                    : "₹1,999 Once"}
              </>
            )}
          </Button>

          <div className="flex items-center justify-between px-1 text-[11px] text-[#5F6368]">
            <span>✓ Secure Razorpay UPI & Cards</span>
            <Link
              to="/author/billing"
              onClick={() => onOpenChange(false)}
              className="font-bold text-[#111111] hover:underline"
            >
              View Full Billing Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
