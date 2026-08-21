import {
  BILLING_PLANS,
  formatInrFromPaise,
  isPaidBillingPlanCode,
  type BillingPlanCode,
  type PaidBillingPlanCode,
} from "@shared/billing/plans";
import {
  Check,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  HelpCircle,
  Loader2,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner, PageLoader } from "@/components/ui/async-state";
import {
  cancelBillingSubscription,
  createBillingCheckout,
  fetchBillingStatus,
  openRazorpayCheckout,
  submitRefundRequest,
  verifyBillingCheckout,
  type BillingProfileInput,
} from "@/lib/billing";
import { useAuth } from "@/lib/auth-store";
import { Link, useSearch } from "@/lib/navigation";
import { useQuery } from "@/lib/query";
import { cn } from "@/lib/utils";

const PAID_PLANS: PaidBillingPlanCode[] = ["pro_monthly", "pro_yearly", "lifetime"];

export default function BillingPage() {
  const { user } = useAuth();
  const search = useSearch<{ plan?: string }>();
  const [busyPlan, setBusyPlan] = useState<PaidBillingPlanCode | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["billing-status", user?.id],
    enabled: Boolean(user?.id),
    queryFn: fetchBillingStatus,
    retry: false,
  });

  const status = statusQuery.data;
  const currentPlanCode: BillingPlanCode = status?.entitlement.planCode ?? "free";
  const isPro = status?.entitlement.status === "active" && currentPlanCode !== "free";

  const aiUsed = status?.usage.aiGenerationsThisMonth ?? 0;
  const aiLimit = status?.usage.aiGenerationsLimit ?? 20;

  const startCheckout = async (planCode: PaidBillingPlanCode) => {
    if (!user) {
      toast.error("Please sign in to upgrade.");
      return;
    }
    setBusyPlan(planCode);
    try {
      const profile: BillingProfileInput = {
        legalName: user.name || "GamiBar Host",
        email: user.email || "",
        stateCode: "KA",
      };
      const response = await createBillingCheckout(planCode, profile);
      const result = await openRazorpayCheckout(response.checkout);
      await verifyBillingCheckout(planCode, result);
      toast.success(`${response.plan.name} is now active!`);
      await statusQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout could not be completed.");
    } finally {
      setBusyPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel automatic renewals? You will keep Pro access until the end of your billing period.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const res = await cancelBillingSubscription();
      toast.success(res.message);
      await statusQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRefundSubmit = async (paymentId: number) => {
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for the refund request.");
      return;
    }
    setRefundBusy(true);
    try {
      const res = await submitRefundRequest(paymentId, refundReason.trim());
      toast.success(res.message);
      setRefundPaymentId(null);
      setRefundReason("");
      await statusQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Refund submission failed.");
    } finally {
      setRefundBusy(false);
    }
  };

  const planCards: Array<{
    code: BillingPlanCode;
    title: string;
    description: string;
    price: string;
    period: string;
    buttonText: string;
    featured?: boolean;
    badge?: string;
    features: string[];
  }> = [
    {
      code: "free",
      title: "Free",
      description: "Essentials for engaging classroom activities",
      price: "₹0",
      period: "/ month",
      buttonText: "Free",
      features: [
        "1 Active room at a time",
        "20 AI Option generations / month",
        "Up to 100 Live Players per room",
        "All 6 interactive game modes",
        "1 File QRFile drop (15 MB limit)",
        "7-day QRFile & room retention",
        "Standard classroom support",
      ],
    },
    {
      code: "pro_monthly",
      title: "Pro Monthly",
      description: "Expanded limits with monthly flexibility",
      price: "₹49",
      period: "/ month",
      buttonText: "Get Pro Monthly",
      features: [
        "⚡ Unlimited Concurrent Active Rooms",
        "⚡ Unlimited AI Generations",
        "Up to 200 Live Players per room",
        "All 6 interactive game modes",
        "1 File QRFile drop (50 MB limit)",
        "28-day QRFile retention",
        "Unlimited room lifespan",
        "Cancel anytime",
      ],
    },
    {
      code: "pro_yearly",
      title: "Pro Yearly",
      description: "Best value with 2 months free",
      price: "₹499",
      period: "/ year",
      buttonText: "Get Pro Yearly",
      featured: true,
      badge: "Save 15% · Best Value",
      features: [
        "Everything in Pro Monthly",
        "2 Months Free (₹41.5 / mo)",
        "⚡ Unlimited Concurrent Active Rooms",
        "⚡ Unlimited AI Generations",
        "Up to 200 Live Players per room",
        "Priority AI processing speed",
        "Priority educator support",
      ],
    },
    {
      code: "lifetime",
      title: "Lifetime",
      description: "Pay once, keep Pro permanent forever",
      price: "₹1,999",
      period: "one-time",
      buttonText: "Get Lifetime",
      badge: "One-Time Payment",
      features: [
        "Permanent Pro access forever",
        "⚡ Unlimited Concurrent Active Rooms",
        "⚡ Unlimited AI Generations",
        "Up to 200 Live Players per room",
        "All future Pro features included",
        "Zero renewal fees ever",
        "VIP priority support",
      ],
    },
  ];

  return (
    <AuthorShell>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 text-[#111111]">
        {/* Page Title Header (ChatGPT Pricing Style) */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 mb-3">
            <Sparkles className="size-3.5 text-amber-600" />
            Simple, Transparent Educator Pricing
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
            Upgrade your classroom intelligence
          </h1>
          <p className="mt-2 text-sm text-[#5F6368] leading-relaxed">
            Choose the plan that fits your classroom or institution. Cancel anytime.
          </p>
        </div>

        {/* 4-Card Pricing Grid (ChatGPT style) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {planCards.map((card) => {
            const isCurrent = currentPlanCode === card.code;
            const isPaid = card.code !== "free";
            const isBusy = busyPlan === card.code;

            return (
              <div
                key={card.code}
                className={cn(
                  "relative flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all duration-200",
                  card.featured
                    ? "border-[#111111] shadow-[0_12px_36px_rgba(0,0,0,0.08)] ring-2 ring-[#111111]"
                    : "border-[#E7E9ED] shadow-xs hover:border-[#CBD5E1] hover:shadow-md",
                )}
              >
                {/* Top Badge */}
                {card.badge && (
                  <span
                    className={cn(
                      "absolute -top-3 left-6 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      card.featured
                        ? "bg-[#111111] text-white shadow-sm"
                        : "bg-amber-100 text-amber-900 border border-amber-200",
                    )}
                  >
                    {card.badge}
                  </span>
                )}

                <div>
                  <h3 className="font-display text-lg font-extrabold text-[#111111]">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#5F6368] min-h-[32px]">{card.description}</p>

                  {/* Price */}
                  <div className="my-5 flex items-baseline gap-1 border-b border-[#F0F2F5] pb-5">
                    <span className="font-display text-3xl sm:text-4xl font-black text-[#111111]">
                      {card.price}
                    </span>
                    <span className="text-xs font-semibold text-[#5F6368]">{card.period}</span>
                  </div>

                  {/* Action Button */}
                  <div className="mb-6">
                    {isCurrent ? (
                      <Button
                        disabled
                        className="w-full h-11 rounded-xl bg-[#F3F4F6] text-[#4B5563] font-bold text-xs cursor-default border border-[#E5E7EB]"
                      >
                        ✓ Current Plan
                      </Button>
                    ) : isPaid ? (
                      <Button
                        type="button"
                        disabled={Boolean(busyPlan)}
                        onClick={() => startCheckout(card.code as PaidBillingPlanCode)}
                        className={cn(
                          "w-full h-11 rounded-xl text-xs font-extrabold transition-all duration-150 active:scale-[0.98]",
                          card.featured
                            ? "bg-[#FF3B30] text-white hover:bg-[#E6332B] shadow-md shadow-red-500/20"
                            : "bg-[#111111] text-white hover:bg-[#2A2A2A] shadow-xs",
                        )}
                      >
                        {isBusy ? (
                          <>
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          card.buttonText
                        )}
                      </Button>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        className="w-full h-11 rounded-xl text-xs font-bold"
                      >
                        Free Forever
                      </Button>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 text-xs text-[#374151]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">
                      Features Included:
                    </p>
                    {card.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5">
                        <Check className="size-4 shrink-0 text-emerald-600 font-bold mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F0F2F5] text-center">
                  <span className="text-[10px] text-[#9CA3AF] font-medium">
                    {card.code === "free"
                      ? "No credit card needed"
                      : "Instant activation with Razorpay UPI & Cards"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Plan & AI Usage Status Card */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {/* Active Plan Summary */}
          <div className="rounded-3xl border border-[#E7E9ED] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F0F2F5] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-5 text-[#111111]" />
                <h2 className="font-display text-base font-extrabold text-[#111111]">
                  Active Membership
                </h2>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider",
                  isPro
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : "bg-[#F3F4F6] text-[#4B5563]",
                )}
              >
                {status?.currentPlan.name ?? "GamiBar Free"}
              </span>
            </div>

            <div className="space-y-3 text-xs text-[#5F6368]">
              <p>
                <strong className="text-[#111111]">Plan:</strong>{" "}
                {status?.currentPlan.name ?? "GamiBar Free"} ({status?.currentPlan.billingLabel})
              </p>
              {status?.subscription?.currentEnd && (
                <p>
                  <strong className="text-[#111111]">Next Renewal:</strong>{" "}
                  {new Date(status.subscription.currentEnd).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </p>
              )}
              {status?.subscription?.cancelAtCycleEnd && (
                <p className="text-amber-700 font-semibold">
                  Renewal cancelled. Pro access remains active until current cycle ends.
                </p>
              )}
            </div>

            {status?.subscription && !status.subscription.cancelAtCycleEnd && (
              <div className="mt-5 pt-4 border-t border-[#F0F2F5]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cancelling}
                  onClick={handleCancelSubscription}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                >
                  {cancelling ? "Cancelling..." : "Cancel Auto-Renewal"}
                </Button>
              </div>
            )}
          </div>

          {/* AI Usage Tracker */}
          <div className="rounded-3xl border border-[#E7E9ED] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F0F2F5] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Zap className="size-5 text-amber-500 fill-amber-500" />
                <h2 className="font-display text-base font-extrabold text-[#111111]">
                  AI Generation Quota
                </h2>
              </div>
              <span className="text-xs font-black text-[#111111]">
                {isPro ? "Unlimited ⚡" : `${aiUsed} / ${aiLimit} Used`}
              </span>
            </div>

            <p className="text-xs text-[#5F6368] leading-relaxed">
              Every time you generate options or questions using AI, 1 generation credit is used.
            </p>

            {!isPro && (
              <div className="mt-4 space-y-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
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
                <div className="flex justify-between text-[11px] text-[#5F6368]">
                  <span>{Math.max(0, aiLimit - aiUsed)} generations left this cycle</span>
                  <span>Resets monthly</span>
                </div>
              </div>
            )}

            {!isPro && aiUsed >= aiLimit && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 font-medium">
                You have reached your 20 monthly free AI credits. Upgrade to Pro for ₹49/month for
                unlimited generations.
              </div>
            )}
          </div>
        </div>

        {/* Invoices & Payment History */}
        {status?.payments && status.payments.length > 0 && (
          <div className="rounded-3xl border border-[#E7E9ED] bg-white p-6 shadow-xs mt-8">
            <div className="flex items-center gap-2.5 border-b border-[#F0F2F5] pb-4 mb-4">
              <ReceiptText className="size-5 text-[#111111]" />
              <h2 className="font-display text-base font-extrabold text-[#111111]">
                Payment Invoices & Receipts
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#374151]">
                <thead>
                  <tr className="border-b border-[#E7E9ED] text-[#9CA3AF] uppercase font-bold">
                    <th className="py-2.5 pr-4">Invoice #</th>
                    <th className="py-2.5 pr-4">Plan</th>
                    <th className="py-2.5 pr-4">Amount</th>
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5]">
                  {status.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8F9FB]">
                      <td className="py-3 pr-4 font-mono font-medium">
                        {p.invoiceNumber ?? `INV-${p.id}`}
                      </td>
                      <td className="py-3 pr-4 font-bold text-[#111111]">
                        {BILLING_PLANS[p.planCode]?.shortName ?? p.planCode}
                      </td>
                      <td className="py-3 pr-4 font-bold">
                        {formatInrFromPaise(p.totalAmountPaise)}
                      </td>
                      <td className="py-3 pr-4 text-[#5F6368]">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={`/api/billing/invoice/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#FF3B30] font-bold hover:underline"
                        >
                          <Download className="size-3.5" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthorShell>
  );
}
