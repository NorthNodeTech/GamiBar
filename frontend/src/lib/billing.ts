import type { BillingPlan, BillingPlanCode, PaidBillingPlanCode } from "@shared/billing/plans";

import { apiFetch, apiPost } from "@/lib/api-client";

export type BillingProfile = {
  legalName: string;
  email: string;
  phone: string | null;
  gstin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateCode: string;
  postalCode: string | null;
  countryCode: string;
};

export type BillingPayment = {
  id: number;
  planCode: PaidBillingPlanCode;
  status: string;
  invoiceNumber: string | null;
  currency: "INR";
  baseAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  totalAmountPaise: number;
  paidAt: string | null;
  refundEligibleUntil: string | null;
  refundedAt: string | null;
};

export type BillingStatus = {
  currentPlan: BillingPlan;
  entitlement: {
    planCode: BillingPlanCode;
    status: string;
    validUntil: string | null;
    source: string;
  };
  profile: BillingProfile | null;
  subscription: {
    planCode: "pro_monthly" | "pro_yearly";
    status: string;
    currentStart: string | null;
    currentEnd: string | null;
    cancellationRequestedAt: string | null;
    cancelAtCycleEnd: boolean;
  } | null;
  payments: BillingPayment[];
  refunds: Array<{
    id: number;
    paymentOrderId: number;
    status: string;
    reason: string;
    requestedAmountPaise: number;
    resolutionNote: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
  usage: {
    aiGenerationsThisMonth: number;
    aiGenerationsLimit: number | null;
  };
  refundWindowDays: number;
};

export type BillingProfileInput = {
  legalName: string;
  email: string;
  phone?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateCode: string;
  postalCode?: string;
};

export type RazorpayCheckoutConfiguration = {
  keyId: string;
  orderId?: string;
  subscriptionId?: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes: { plan_code: string };
};

export type BillingCheckoutResponse = {
  checkout: RazorpayCheckoutConfiguration;
  plan: BillingPlan;
};

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  image?: string;
  order_id?: string;
  subscription_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>;
  theme: { color: string };
  modal: { confirm_close: boolean; ondismiss: () => void };
  handler: (result: RazorpaySuccess) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", callback: (response: unknown) => void) => void;
    };
  }
}

let checkoutScriptPromise: Promise<void> | null = null;
const RAZORPAY_IFRAME_ALLOW = "payment *; accelerometer *; gyroscope *; magnetometer *";

function publicCheckoutLogoUrl(): string | undefined {
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : undefined;
  if (currentHostname && isLoopbackHost(currentHostname)) return undefined;

  const configuredPublicUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const candidates = [
    configuredPublicUrl,
    typeof window !== "undefined" ? window.location.origin : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL("/apple-touch-icon.png", candidate);
      if (url.protocol === "https:" && !isLoopbackHost(url.hostname)) {
        return url.toString();
      }
    } catch {
      // Ignore malformed local env values and continue without a checkout logo.
    }
  }

  return undefined;
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function allowRazorpayIframeFeatures(): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => undefined;
  }

  const apply = (node: Node) => {
    if (!(node instanceof HTMLIFrameElement)) return;
    const src = node.getAttribute("src") ?? "";
    if (!src.includes("razorpay.com")) return;
    node.setAttribute("allow", RAZORPAY_IFRAME_ALLOW);
  };

  document.querySelectorAll('iframe[src*="razorpay.com"]').forEach(apply);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(apply);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const timeout = window.setTimeout(() => observer.disconnect(), 15_000);

  return () => {
    window.clearTimeout(timeout);
    observer.disconnect();
  };
}

export function fetchBillingStatus(): Promise<BillingStatus> {
  return apiFetch<BillingStatus>("/api/billing/status");
}

export function createBillingCheckout(
  planCode: PaidBillingPlanCode,
  billing: BillingProfileInput,
): Promise<BillingCheckoutResponse> {
  return apiPost<BillingCheckoutResponse>("/api/billing/checkout", { planCode, billing });
}

export function verifyBillingCheckout(
  planCode: PaidBillingPlanCode,
  result: RazorpaySuccess,
): Promise<{ ok: true; status: string; plan: BillingPlan }> {
  return apiPost("/api/billing/verify", {
    planCode,
    paymentId: result.razorpay_payment_id,
    orderId: result.razorpay_order_id,
    subscriptionId: result.razorpay_subscription_id,
    signature: result.razorpay_signature,
  });
}

export function cancelBillingSubscription(): Promise<{
  ok: true;
  message: string;
  currentEnd: string | null;
}> {
  return apiPost("/api/billing/cancel", {});
}

export function submitRefundRequest(
  paymentOrderId: number,
  reason: string,
): Promise<{ ok: true; message: string }> {
  return apiPost("/api/billing/refunds", { paymentOrderId, reason });
}

export async function openRazorpayCheckout(
  configuration: RazorpayCheckoutConfiguration,
): Promise<RazorpaySuccess> {
  await loadRazorpayCheckout();
  const Razorpay = window.Razorpay;
  if (!Razorpay)
    throw new Error("Razorpay Checkout did not load. Check your connection and retry.");

  const logoUrl = publicCheckoutLogoUrl();

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    let completed = false;
    const stopAllowingIframeFeatures = allowRazorpayIframeFeatures();
    const checkout = new Razorpay({
      key: configuration.keyId,
      ...(logoUrl ? { image: logoUrl } : {}),
      order_id: configuration.orderId,
      subscription_id: configuration.subscriptionId,
      ...(configuration.orderId
        ? { amount: configuration.amount, currency: configuration.currency }
        : {}),
      name: configuration.name,
      description: configuration.description,
      prefill: configuration.prefill,
      notes: configuration.notes,
      theme: { color: "#111111" },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          stopAllowingIframeFeatures();
          if (!completed) {
            reject(new Error("Checkout was closed before payment completed."));
          }
        },
      },
      handler: (result) => {
        completed = true;
        stopAllowingIframeFeatures();
        resolve(result);
      },
    });
    // Razorpay keeps Checkout open after a failed attempt so the customer can
    // retry another method. Resolve only on success; reject only on dismissal.
    checkout.on("payment.failed", () => undefined);
    checkout.open();
  });
}

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  const pending = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Razorpay Checkout failed to load.")),
        {
          once: true,
        },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay Checkout failed to load."));
    document.head.append(script);
  }).catch((error) => {
    checkoutScriptPromise = null;
    throw error;
  });
  checkoutScriptPromise = pending;
  return pending;
}
