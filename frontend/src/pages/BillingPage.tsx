import {
  BILLING_PLANS,
  formatInrFromPaise,
  isPaidBillingPlanCode,
  type PaidBillingPlanCode,
} from "@shared/billing/plans";
import { Check, CreditCard, Loader2, ReceiptText, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineErrorBanner } from "@/components/ui/async-state";
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
const INDIA_STATES = [
  ["AN", "Andaman and Nicobar Islands"],
  ["AP", "Andhra Pradesh"],
  ["AR", "Arunachal Pradesh"],
  ["AS", "Assam"],
  ["BR", "Bihar"],
  ["CG", "Chhattisgarh"],
  ["CH", "Chandigarh"],
  ["DL", "Delhi"],
  ["DN", "Dadra and Nagar Haveli and Daman and Diu"],
  ["GA", "Goa"],
  ["GJ", "Gujarat"],
  ["HR", "Haryana"],
  ["HP", "Himachal Pradesh"],
  ["JH", "Jharkhand"],
  ["JK", "Jammu and Kashmir"],
  ["KA", "Karnataka"],
  ["KL", "Kerala"],
  ["LA", "Ladakh"],
  ["LD", "Lakshadweep"],
  ["MP", "Madhya Pradesh"],
  ["MH", "Maharashtra"],
  ["MN", "Manipur"],
  ["ML", "Meghalaya"],
  ["MZ", "Mizoram"],
  ["NL", "Nagaland"],
  ["OD", "Odisha"],
  ["PY", "Puducherry"],
  ["PB", "Punjab"],
  ["RJ", "Rajasthan"],
  ["SK", "Sikkim"],
  ["TN", "Tamil Nadu"],
  ["TS", "Telangana"],
  ["TR", "Tripura"],
  ["UP", "Uttar Pradesh"],
  ["UK", "Uttarakhand"],
  ["WB", "West Bengal"],
] as const;

const emptyProfile: BillingProfileInput = {
  legalName: "",
  email: "",
  phone: "",
  gstin: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateCode: "KA",
  postalCode: "",
};

export default function BillingPage() {
  const { user } = useAuth();
  const search = useSearch<{ plan?: string }>();
  const requestedPlan = isPaidBillingPlanCode(search.plan) ? search.plan : "pro_yearly";
  const [selectedPlan, setSelectedPlan] = useState<PaidBillingPlanCode>(requestedPlan);
  const [profile, setProfile] = useState<BillingProfileInput>(emptyProfile);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    if (profileHydrated || !user) return;
    if (status?.profile) {
      setProfile({
        legalName: status.profile.legalName,
        email: status.profile.email,
        phone: status.profile.phone ?? "",
        gstin: status.profile.gstin ?? "",
        addressLine1: status.profile.addressLine1 ?? "",
        addressLine2: status.profile.addressLine2 ?? "",
        city: status.profile.city ?? "",
        stateCode: status.profile.stateCode,
        postalCode: status.profile.postalCode ?? "",
      });
      setProfileHydrated(true);
      return;
    }
    if (!statusQuery.isLoading) {
      setProfile((current) => ({
        ...current,
        legalName: current.legalName || user.name,
        email: current.email || user.email,
      }));
      setProfileHydrated(true);
    }
  }, [profileHydrated, status, statusQuery.isLoading, user]);

  const plan = BILLING_PLANS[selectedPlan];
  const canRefundIds = useMemo(
    () => new Set(status?.refunds.map((refund) => refund.paymentOrderId) ?? []),
    [status?.refunds],
  );

  const startCheckout = async () => {
    if (!accepted) {
      toast.error("Accept the Terms, Privacy Policy, and Refund Policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const response = await createBillingCheckout(selectedPlan, profile);
      const result = await openRazorpayCheckout(response.checkout);
      await verifyBillingCheckout(selectedPlan, result);
      toast.success(`${response.plan.name} is now active.`);
      await statusQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    setCancelling(true);
    try {
      const result = await cancelBillingSubscription();
      toast.success(result.message);
      await statusQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Subscription could not be cancelled.");
    } finally {
      setCancelling(false);
    }
  };

  const requestRefund = async () => {
    if (!refundPaymentId || refundReason.trim().length < 5) {
      toast.error("Add a short reason for the refund request.");
      return;
    }
    setRefundBusy(true);
    try {
      const result = await submitRefundRequest(refundPaymentId, refundReason.trim());
      toast.success(result.message);
      setRefundPaymentId(null);
      setRefundReason("");
      await statusQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Refund request could not be submitted.",
      );
    } finally {
      setRefundBusy(false);
    }
  };

  return (
    <AuthorShell>
      <div className="mx-auto w-full max-w-6xl py-3 text-[#111111] sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#5F6368]">Account</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Billing & plans</h1>
            <p className="mt-2 text-sm leading-6 text-[#5F6368]">
              Secure Razorpay checkout, GST breakdown, subscription controls, and receipts.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/pricing">Compare plans</Link>
          </Button>
        </div>

        {statusQuery.isError ? (
          <div className="mt-6">
            <InlineErrorBanner
              message={
                statusQuery.error instanceof Error
                  ? statusQuery.error.message
                  : "Billing could not be loaded."
              }
              onRetry={() => void statusQuery.refetch()}
              retrying={statusQuery.isFetching}
            />
          </div>
        ) : null}

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
          <section className="rounded-3xl border border-[#E1E4E8] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF3B30]">
                  Choose access
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">Upgrade GamiBAR</h2>
              </div>
              <ShieldCheck className="size-7 text-[#16A34A]" />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {PAID_PLANS.map((code) => {
                const item = BILLING_PLANS[code];
                const selected = selectedPlan === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedPlan(code)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      selected
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-[#D9DDE3] bg-white hover:border-[#9CA3AF]",
                    )}
                  >
                    <span className="text-sm font-bold">{item.shortName}</span>
                    <span
                      className={cn(
                        "mt-1 block text-xs",
                        selected ? "text-white/65" : "text-[#5F6368]",
                      )}
                    >
                      {formatInrFromPaise(item.baseAmountPaise)} {item.billingLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-[#F6F7F9] p-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{plan.name}</span>
                <span className="font-display text-2xl font-bold">
                  {formatInrFromPaise(plan.baseAmountPaise)}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-[#5F6368]">
                <span>GST (18%)</span>
                <span>{formatInrFromPaise(plan.gstAmountPaise)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-[#D9DDE3] pt-3 font-bold">
                <span>Total charged</span>
                <span>{formatInrFromPaise(plan.totalAmountPaise)}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Billing name"
                value={profile.legalName}
                onChange={(value) => setProfileField("legalName", value)}
                required
              />
              <Field
                label="Billing email"
                value={profile.email}
                onChange={(value) => setProfileField("email", value)}
                type="email"
                required
              />
              <Field
                label="Phone"
                value={profile.phone ?? ""}
                onChange={(value) => setProfileField("phone", value)}
                placeholder="+91 63033 92391"
              />
              <div>
                <Label htmlFor="billing-state">State / Union Territory</Label>
                <select
                  id="billing-state"
                  value={profile.stateCode}
                  onChange={(event) => setProfileField("stateCode", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9DDE3] bg-white px-3 text-sm outline-none focus:border-[#111111]"
                >
                  {INDIA_STATES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="GSTIN (optional)"
                value={profile.gstin ?? ""}
                onChange={(value) => setProfileField("gstin", value.toUpperCase())}
                placeholder="15-character GSTIN"
                maxLength={15}
              />
              <Field
                label="PIN code (optional)"
                value={profile.postalCode ?? ""}
                onChange={(value) =>
                  setProfileField("postalCode", value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
              />
              <Field
                label="Address (optional)"
                value={profile.addressLine1 ?? ""}
                onChange={(value) => setProfileField("addressLine1", value)}
              />
              <Field
                label="City (optional)"
                value={profile.city ?? ""}
                onChange={(value) => setProfileField("city", value)}
              />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E1E4E8] p-4 text-sm leading-6 text-[#4B5563]">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-4 accent-[#111111]"
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="font-semibold text-[#111111] underline">
                  Terms
                </Link>
                ,{" "}
                <Link to="/privacy" className="font-semibold text-[#111111] underline">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link to="/refund-policy" className="font-semibold text-[#111111] underline">
                  7-day Refund Policy
                </Link>
                .
              </span>
            </label>

            <Button
              type="button"
              disabled={busy || statusQuery.isLoading}
              onClick={() => void startCheckout()}
              className="mt-5 h-12 w-full rounded-xl bg-[#111111] text-white hover:bg-[#2A2A2A]"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Opening secure checkout...
                </>
              ) : (
                <>
                  <CreditCard className="size-4" />
                  Continue with Razorpay
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-[#737780]">
              Card, UPI, netbanking and other enabled methods are handled by Razorpay. GamiBAR never
              receives your full card or UPI credentials.
            </p>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-[#E1E4E8] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5F6368]">
                Current plan
              </p>
              {statusQuery.isLoading ? (
                <Loader2 className="mt-5 size-5 animate-spin" />
              ) : (
                <>
                  <h2 className="mt-3 font-display text-2xl font-bold">
                    {status?.currentPlan.name ?? "GamiBAR Free"}
                  </h2>
                  <p className="mt-2 text-sm text-[#5F6368]">
                    {status?.currentPlan.description ?? BILLING_PLANS.free.description}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {[
                      "All 6 game modes",
                      `${status?.currentPlan.limits.livePlayersPerRoom ?? 100} live players per room`,
                      status?.currentPlan.limits.aiGenerationsPerMonth == null
                        ? "Fair-use unlimited AI"
                        : `${status.currentPlan.limits.aiGenerationsPerMonth} AI generations monthly`,
                    ].map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 size-4 text-[#16A34A]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {status?.subscription && !status.subscription.cancellationRequestedAt ? (
                    <Button
                      variant="outline"
                      disabled={cancelling}
                      onClick={() => void cancelSubscription()}
                      className="mt-5 w-full rounded-xl"
                    >
                      {cancelling ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      Cancel renewal
                    </Button>
                  ) : null}
                  {status?.subscription?.cancellationRequestedAt ? (
                    <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                      Renewal is cancelled. Access continues through{" "}
                      {formatDate(status.subscription.currentEnd)}.
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section className="rounded-3xl border border-[#E1E4E8] bg-white p-5">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5" />
                <h2 className="font-display text-lg font-bold">Payments</h2>
              </div>
              <div className="mt-4 space-y-3">
                {status?.payments.length ? (
                  status.payments.map((payment) => {
                    const eligible =
                      payment.status === "paid" &&
                      payment.refundEligibleUntil &&
                      new Date(payment.refundEligibleUntil).getTime() > Date.now() &&
                      !canRefundIds.has(payment.id);
                    return (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-[#E7E9ED] p-3 text-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold">
                            {BILLING_PLANS[payment.planCode].shortName}
                          </span>
                          <span className="font-bold">
                            {formatInrFromPaise(payment.totalAmountPaise)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#737780]">
                          {payment.invoiceNumber ?? "Receipt pending"} ·{" "}
                          {formatDate(payment.paidAt)}
                        </p>
                        {eligible ? (
                          <button
                            type="button"
                            onClick={() => setRefundPaymentId(payment.id)}
                            className="mt-2 text-xs font-semibold text-[#B42318] underline"
                          >
                            Request refund
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#737780]">No completed payments yet.</p>
                )}
              </div>
            </section>
          </aside>
        </div>

        {refundPaymentId ? (
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Request refund"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="font-display text-xl font-bold">Request a refund</h2>
              <p className="mt-2 text-sm leading-6 text-[#5F6368]">
                Requests must be submitted within seven days. Support reviews eligibility before any
                money is moved.
              </p>
              <textarea
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                maxLength={1000}
                placeholder="Tell us why you are requesting a refund"
                className="mt-4 min-h-28 w-full rounded-xl border border-[#D9DDE3] p-3 text-sm outline-none focus:border-[#111111]"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefundPaymentId(null);
                    setRefundReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={refundBusy}
                  onClick={() => void requestRefund()}
                  className="bg-[#111111] text-white"
                >
                  {refundBusy ? <Loader2 className="size-4 animate-spin" /> : null}Submit request
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthorShell>
  );

  function setProfileField<K extends keyof BillingProfileInput>(
    key: K,
    value: BillingProfileInput[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }
}

function Field({
  label,
  value,
  onChange,
  ...props
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  const id = `billing-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 rounded-xl border-[#D9DDE3]"
        {...props}
      />
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Pending";
}
