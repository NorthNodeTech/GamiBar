import { useState } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { type PaidBillingPlanCode } from "@shared/billing/plans";
import { createBillingCheckout, openRazorpayCheckout, verifyBillingCheckout } from "@/lib/billing";
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
  featureDescription = "Get unlimited active rooms, unlimited AI generations, and 28-day QRFile retention.",
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
      const { checkout } = await createBillingCheckout(planCode, {
        legalName: user.name ?? "GamiBar Host",
        email: user.email ?? "",
        stateCode: "KA",
      });

      const razorpayResult = await openRazorpayCheckout(checkout);
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
    savings?: string;
  }> = [
    {
      code: "pro_monthly",
      name: "Monthly",
      price: "₹49",
      period: "/ mo",
      savings: "Flexible monthly billing",
    },
    {
      code: "pro_yearly",
      name: "Yearly",
      price: "₹499",
      period: "/ yr",
      badge: "Save 15% · Best Value",
      savings: "2 Months Free (₹41.5/mo)",
    },
    {
      code: "lifetime",
      name: "Lifetime Access",
      price: "₹1,999",
      period: "once",
      badge: "Pay Once",
      savings: "Zero renewals ever",
    },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm animate-in fade-in duration-150 sm:p-4">
      <div className="relative my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 text-[#111111] shadow-2xl animate-in zoom-in-95 duration-150 sm:p-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-[#F3F4F6] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
          aria-label="Close upgrade dialog"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="mx-auto max-w-md text-center pt-1">
          <div className="mx-auto grid size-11 place-items-center rounded-2xl border border-black/10 bg-[#111111] text-[#FF3B30] shadow-md">
            <Sparkles className="size-5 text-[#FF3B30]" />
          </div>
          <h2 className="mt-3 font-display text-xl font-black text-[#111111] sm:text-2xl">
            {featureTitle}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6368]">{featureDescription}</p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-[#F8F9FA] p-3 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#111111]">
            <Check className="size-3.5 shrink-0 stroke-[3] text-[#FF3B30]" />
            <span>Unlimited Active Rooms</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#111111]">
            <Check className="size-3.5 shrink-0 stroke-[3] text-[#FF3B30]" />
            <span>Unlimited AI Generations</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#111111]">
            <Check className="size-3.5 shrink-0 stroke-[3] text-[#FF3B30]" />
            <span>Up to 200 Live Players</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#111111]">
            <Check className="size-3.5 shrink-0 stroke-[3] text-[#FF3B30]" />
            <span>28-day QRFile Retention</span>
          </div>
        </div>

        {/* Plan Cards Selector */}
        <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setSelectedPlan(p.code)}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-150",
                  isSelected
                    ? "border-[#111111] bg-[#111111] text-white shadow-md"
                    : "border-black/10 bg-[#F8F9FA] text-[#111111] hover:border-[#111111]/30 hover:bg-white",
                )}
              >
                {p.badge && (
                  <span
                    className={cn(
                      "absolute -top-2 left-2.5 rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider",
                      isSelected ? "bg-[#FF3B30] text-white shadow-xs" : "bg-[#111111] text-white",
                    )}
                  >
                    {p.badge}
                  </span>
                )}

                <div>
                  <p
                    className={cn(
                      "text-[11px] font-bold",
                      isSelected ? "text-gray-300" : "text-[#5F6368]",
                    )}
                  >
                    {p.name}
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="font-display text-xl font-black">{p.price}</span>
                    <span
                      className={cn("text-[10px]", isSelected ? "text-gray-400" : "text-[#5F6368]")}
                    >
                      {p.period}
                    </span>
                  </div>
                </div>

                <p
                  className={cn(
                    "mt-1 text-[10px] font-semibold",
                    isSelected ? "text-[#FF8B80]" : "text-[#5F6368]",
                  )}
                >
                  {p.savings}
                </p>
              </button>
            );
          })}
        </div>

        {/* Direct Razorpay Checkout Action */}
        <div className="mt-4 flex flex-col gap-2 pt-1">
          <Button
            type="button"
            disabled={busy}
            onClick={() => handleCheckout(selectedPlan)}
            className="h-11 w-full rounded-xl bg-[#FF3B30] text-xs font-extrabold text-white shadow-md transition-transform hover:bg-[#E6332B] active:scale-[0.99]"
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

          <div className="flex items-center justify-between px-1 text-[10px] text-[#5F6368] sm:text-[11px]">
            <span>✓ Secure Razorpay UPI & Cards</span>
            <Link
              to="/author/billing"
              onClick={() => onOpenChange(false)}
              className="font-bold text-[#111111] hover:underline"
            >
              View Billing Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
