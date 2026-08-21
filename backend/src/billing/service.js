import {
  BILLING_PLANS,
  GST_RATE_BPS,
  isPaidBillingPlanCode,
} from "../../../shared/billing/plans.ts";

import { HttpError } from "../http-error.js";
import { createAdminClient } from "../supabase-admin.js";
import {
  cancelRazorpaySubscription,
  createRazorpayOrder,
  createRazorpaySubscription,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  fetchRazorpayPlan,
  fetchRazorpaySubscription,
  publicRazorpayKeyId,
  razorpayPlanId,
  verifyCheckoutSignature,
} from "./razorpay.js";

const ACTIVE_SUBSCRIPTION_STATUSES = [
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
];
const CHECKOUT_SUBSCRIPTION_STATUSES = [
  "created",
  ...ACTIVE_SUBSCRIPTION_STATUSES,
];
const ABANDONED_CHECKOUT_MS = 15 * 60 * 1000;
const PAID_ENTITLEMENT_STATUSES = new Set(["active", "past_due"]);
const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PLAN_CACHE_MS = 5 * 60 * 1000;
const INDIA_STATE_CODES = new Set([
  "AN",
  "AP",
  "AR",
  "AS",
  "BR",
  "CG",
  "CH",
  "DD",
  "DL",
  "DN",
  "GA",
  "GJ",
  "HP",
  "HR",
  "JH",
  "JK",
  "KA",
  "KL",
  "LA",
  "LD",
  "MH",
  "ML",
  "MN",
  "MP",
  "MZ",
  "NL",
  "OD",
  "PB",
  "PY",
  "RJ",
  "SK",
  "TN",
  "TR",
  "TS",
  "UK",
  "UP",
  "WB",
]);

const planValidationCache = new Map();

export async function getBillingStatus(user) {
  const admin = createAdminClient();
  const [
    profileResult,
    entitlementResult,
    subscriptionsResult,
    paymentsResult,
    refundsResult,
    usage,
  ] = await Promise.all([
    admin
      .from("gamibar_billing_profiles")
      .select("*")
      .eq("author_id", user.id)
      .maybeSingle(),
    admin
      .from("gamibar_entitlements")
      .select("*")
      .eq("author_id", user.id)
      .maybeSingle(),
    admin
      .from("gamibar_subscriptions")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("gamibar_payment_orders")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("gamibar_refund_requests")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    getMonthlyAiUsage(admin, user.id),
  ]);

  throwFirstError([
    profileResult,
    entitlementResult,
    subscriptionsResult,
    paymentsResult,
    refundsResult,
  ]);

  const entitlement = effectiveEntitlement(entitlementResult.data);
  const currentPlan = BILLING_PLANS[entitlement.planCode];

  return {
    currentPlan,
    entitlement,
    profile: profileResult.data
      ? serializeBillingProfile(profileResult.data)
      : null,
    subscription: serializeCurrentSubscription(subscriptionsResult.data ?? []),
    payments: (paymentsResult.data ?? []).map(serializePayment),
    refunds: (refundsResult.data ?? []).map(serializeRefund),
    usage: {
      aiGenerationsThisMonth: usage,
      aiGenerationsLimit: currentPlan.limits.aiGenerationsPerMonth,
    },
    refundWindowDays: 7,
  };
}

export async function createCheckout(user, input) {
  const planCode = input?.planCode;
  if (!isPaidBillingPlanCode(planCode)) {
    throw new HttpError("Choose a valid GamiBAR plan.", 400);
  }
  assertBillingConfiguration();

  const admin = createAdminClient();
  const billingProfile = validateBillingProfile(user, input?.billing);
  const { error: profileError } = await admin
    .from("gamibar_billing_profiles")
    .upsert(
      {
        author_id: user.id,
        ...billingProfile,
      },
      { onConflict: "author_id" },
    );
  if (profileError) throw profileError;

  const entitlement = await fetchEffectiveEntitlement(admin, user.id);
  if (entitlement.planCode === "lifetime") {
    throw new HttpError("This account already has Lifetime access.", 409);
  }

  if (planCode === "lifetime") {
    return createLifetimeCheckout(admin, user, billingProfile);
  }
  return createSubscriptionCheckout(admin, user, planCode, billingProfile);
}

export async function verifyCheckout(user, input) {
  const planCode = input?.planCode;
  if (!isPaidBillingPlanCode(planCode)) {
    throw new HttpError("Invalid checkout plan.", 400);
  }
  const paymentId = stringValue(input?.paymentId, "paymentId", 100);
  const signature = stringValue(input?.signature, "signature", 128);

  if (planCode === "lifetime") {
    return verifyLifetimeCheckout(user, {
      paymentId,
      signature,
      orderId: stringValue(input?.orderId, "orderId", 100),
    });
  }
  return verifySubscriptionCheckout(user, planCode, {
    paymentId,
    signature,
    subscriptionId: stringValue(input?.subscriptionId, "subscriptionId", 100),
  });
}

export async function cancelCurrentSubscription(user) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gamibar_subscriptions")
    .select("*")
    .eq("author_id", user.id)
    .in("status", ACTIVE_SUBSCRIPTION_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("No active subscription was found.", 404);

  const remote = await cancelRazorpaySubscription(
    data.provider_subscription_id,
    true,
  );
  const patch = subscriptionPatch(remote, data.status);
  patch.cancellation_requested_at = new Date().toISOString();
  patch.cancel_at_cycle_end = true;
  const { error: updateError } = await admin
    .from("gamibar_subscriptions")
    .update(patch)
    .eq("id", data.id)
    .eq("author_id", user.id);
  if (updateError) throw updateError;

  return {
    ok: true,
    message:
      "Your subscription will stop renewing at the end of the current billing period.",
    currentEnd: epochToIso(remote.current_end) ?? data.current_end,
  };
}

export async function requestRefund(user, input) {
  const admin = createAdminClient();
  const reason = stringValue(input?.reason, "reason", 1_000).trim();
  if (reason.length < 5)
    throw new HttpError("Please add a short reason for the refund.", 400);

  let query = admin
    .from("gamibar_payment_orders")
    .select("*")
    .eq("author_id", user.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1);
  if (input?.paymentOrderId != null) {
    const paymentOrderId = positiveInteger(
      input.paymentOrderId,
      "paymentOrderId",
    );
    query = admin
      .from("gamibar_payment_orders")
      .select("*")
      .eq("author_id", user.id)
      .eq("id", paymentOrderId)
      .eq("status", "paid")
      .limit(1);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("No refundable payment was found.", 404);

  const eligibility = data.refund_eligible_until
    ? new Date(data.refund_eligible_until).getTime()
    : new Date(data.paid_at ?? data.created_at).getTime() + REFUND_WINDOW_MS;
  if (!Number.isFinite(eligibility) || Date.now() > eligibility) {
    throw new HttpError("The seven-day refund request period has ended.", 400);
  }

  const { data: request, error: requestError } = await admin
    .from("gamibar_refund_requests")
    .insert({
      author_id: user.id,
      payment_order_id: data.id,
      reason,
      requested_amount_paise: data.total_amount_paise,
      status: "requested",
    })
    .select("id, status, created_at")
    .single();
  if (requestError?.code === "23505") {
    throw new HttpError(
      "A refund request already exists for this payment.",
      409,
    );
  }
  if (requestError) throw requestError;

  const { error: paymentError } = await admin
    .from("gamibar_payment_orders")
    .update({ status: "refund_requested" })
    .eq("id", data.id)
    .eq("author_id", user.id)
    .eq("status", "paid");
  if (paymentError) throw paymentError;

  return {
    ok: true,
    request,
    message:
      "Refund request received. Support will review it against the seven-day policy.",
  };
}

export async function getAuthorPlanLimits(authorId) {
  const admin = createAdminClient();
  const entitlement = await fetchEffectiveEntitlement(admin, authorId);
  return {
    planCode: entitlement.planCode,
    ...BILLING_PLANS[entitlement.planCode].limits,
  };
}

export async function assertCanCreateRoom(authorId) {
  const admin = createAdminClient();
  const limits = await getAuthorPlanLimits(authorId);
  if (limits.activeRoomsLimit == null) return; // Unlimited for Pro / Lifetime!

  const { data, error } = await admin
    .from("gamibar_rooms")
    .select("id, code, name, status")
    .eq("author_id", authorId)
    .in("status", ["DRAFT", "LOBBY", "READY", "COUNTDOWN", "LIVE"]);

  if (error) throw error;

  const activeCount = data?.length || 0;
  if (activeCount >= limits.activeRoomsLimit) {
    throw new HttpError(
      "Free accounts can only have 1 active room at a time. Finish your existing active room or upgrade to GamiBar Pro for unlimited concurrent rooms.",
      403,
    );
  }
}

export async function consumeAiGeneration(authorId) {
  const admin = createAdminClient();
  const entitlement = await fetchEffectiveEntitlement(admin, authorId);
  const limit =
    BILLING_PLANS[entitlement.planCode].limits.aiGenerationsPerMonth;
  const periodStart = monthStartUtc();
  const { data, error } = await admin.rpc("gamibar_consume_usage", {
    p_author_id: authorId,
    p_usage_key: "ai_generation",
    p_period_start: periodStart,
    p_limit: limit,
  });
  if (error) throw error;
  if (data == null) {
    throw new HttpError(
      "You used all 20 free AI generations for this month. Upgrade to Pro to continue.",
      429,
    );
  }
  return { used: Number(data), limit, planCode: entitlement.planCode };
}

export async function assertAiGenerationAvailable(authorId) {
  const admin = createAdminClient();
  const entitlement = await fetchEffectiveEntitlement(admin, authorId);
  const limit =
    BILLING_PLANS[entitlement.planCode].limits.aiGenerationsPerMonth;
  const used = await getMonthlyAiUsage(admin, authorId);
  if (limit != null && used >= limit) {
    throw new HttpError(
      "You used all 20 free AI generations for this month. Upgrade to Pro to continue.",
      429,
    );
  }
  return { used, limit, planCode: entitlement.planCode };
}

export async function acquireAiGenerationLease(authorId) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "gamibar_acquire_ai_generation_lease",
    {
      p_author_id: authorId,
      p_lease_seconds: 120,
    },
  );
  if (error) throw error;
  if (!data) {
    throw new HttpError(
      "Wait for the current AI generation to finish before starting another.",
      429,
    );
  }
}

export async function releaseAiGenerationLease(authorId) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("gamibar_release_ai_generation_lease", {
    p_author_id: authorId,
  });
  if (error) throw error;
}

export async function persistPaymentEvent({ eventId, eventType, payload }) {
  const admin = createAdminClient();
  const { error } = await admin.from("gamibar_payment_events").insert({
    provider_event_id: eventId,
    event_type: eventType,
    payload,
    status: "pending",
    signature_verified_at: new Date().toISOString(),
  });
  if (error?.code === "23505") return { duplicate: true };
  if (error) throw error;
  return { duplicate: false };
}

export async function processPaymentEvent(eventId) {
  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("gamibar_payment_events")
    .select("*")
    .eq("provider_event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!event || !new Set(["pending", "failed"]).has(event.status)) return;

  const { data: claimed, error: claimError } = await admin
    .from("gamibar_payment_events")
    .update({
      status: "processing",
      attempts: event.attempts + 1,
      last_error: null,
    })
    .eq("provider_event_id", eventId)
    .in("status", ["pending", "failed"])
    .select("provider_event_id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return;

  try {
    const handled = await applyPaymentEvent(
      admin,
      event.event_type,
      event.payload,
    );
    const { error: doneError } = await admin
      .from("gamibar_payment_events")
      .update({
        status: handled ? "processed" : "ignored",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("provider_event_id", eventId);
    if (doneError) throw doneError;
  } catch (processingError) {
    const message =
      processingError instanceof Error
        ? processingError.message
        : "Unknown error";
    await admin
      .from("gamibar_payment_events")
      .update({ status: "failed", last_error: message.slice(0, 2_000) })
      .eq("provider_event_id", eventId);
    throw processingError;
  }
}

export async function processPendingPaymentEvents(limit = 20) {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { error: recoveryError } = await admin
    .from("gamibar_payment_events")
    .update({
      status: "failed",
      last_error: "Recovered an interrupted webhook attempt.",
    })
    .eq("status", "processing")
    .lt("updated_at", staleBefore);
  if (recoveryError) throw recoveryError;

  const { data, error } = await admin
    .from("gamibar_payment_events")
    .select("provider_event_id")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  for (const event of data ?? []) {
    try {
      await processPaymentEvent(event.provider_event_id);
    } catch (processingError) {
      console.error("Billing webhook processing failed", {
        eventId: event.provider_event_id,
        message:
          processingError instanceof Error
            ? processingError.message
            : "Unknown error",
      });
    }
  }
}

async function createLifetimeCheckout(admin, user, billingProfile) {
  const plan = BILLING_PLANS.lifetime;
  const recentCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: existing, error: existingError } = await admin
    .from("gamibar_payment_orders")
    .select("*")
    .eq("author_id", user.id)
    .eq("plan_code", "lifetime")
    .eq("status", "created")
    .gte("created_at", recentCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  const tax = taxBreakdown();
  if (existing?.provider_order_id) {
    const remote = await fetchRazorpayOrder(existing.provider_order_id);
    if (
      remote.status === "created" &&
      Number(remote.amount) === plan.totalAmountPaise
    ) {
      return checkoutResponse(user, plan, billingProfile, {
        orderId: remote.id,
      });
    }
  }

  const receipt = createReceipt(user.id, "life");
  const order = await createRazorpayOrder({
    amount: plan.totalAmountPaise,
    currency: "INR",
    receipt,
    notes: {
      author_id: user.id,
      plan_code: "lifetime",
      base_amount_paise: String(plan.baseAmountPaise),
      tax_rate_bps: String(GST_RATE_BPS),
    },
  });

  const { error } = await admin.from("gamibar_payment_orders").insert({
    author_id: user.id,
    plan_code: "lifetime",
    provider_order_id: order.id,
    receipt,
    status: "created",
    currency: "INR",
    base_amount_paise: plan.baseAmountPaise,
    gst_rate_bps: GST_RATE_BPS,
    ...tax,
    total_amount_paise: plan.totalAmountPaise,
  });
  if (error) throw error;

  return checkoutResponse(user, plan, billingProfile, { orderId: order.id });
}

async function createSubscriptionCheckout(
  admin,
  user,
  planCode,
  billingProfile,
) {
  const plan = BILLING_PLANS[planCode];
  const { data: current, error: currentError } = await admin
    .from("gamibar_subscriptions")
    .select("*")
    .eq("author_id", user.id)
    .in("status", CHECKOUT_SUBSCRIPTION_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (currentError) throw currentError;
  if (current) {
    let remote;
    try {
      remote = await fetchRazorpaySubscription(
        current.provider_subscription_id,
      );
    } catch (error) {
      if (!canDiscardUnavailableCheckoutSubscription(error, current)) {
        throw error;
      }

      await discardUnavailableCheckoutSubscription(admin, current, error);
    }

    if (remote) {
      const remoteStatus = normalizeSubscriptionStatus(remote.status);
      const { error: syncError } = await admin
        .from("gamibar_subscriptions")
        .update(subscriptionPatch(remote, remoteStatus))
        .eq("id", current.id);
      if (syncError) throw syncError;

      const createdAt = new Date(current.created_at).getTime();
      const isRecent =
        Number.isFinite(createdAt) &&
        Date.now() - createdAt < ABANDONED_CHECKOUT_MS;
      if (
        remoteStatus === "created" &&
        current.plan_code === planCode &&
        isRecent
      ) {
        return checkoutResponse(user, plan, billingProfile, {
          subscriptionId: current.provider_subscription_id,
        });
      }

      if (remoteStatus === "created") {
        const cancelled = await cancelRazorpaySubscription(
          current.provider_subscription_id,
          false,
        );
        const { error: cancelSyncError } = await admin
          .from("gamibar_subscriptions")
          .update(subscriptionPatch(cancelled, "cancelled"))
          .eq("id", current.id);
        if (cancelSyncError) throw cancelSyncError;
      } else if (ACTIVE_SUBSCRIPTION_STATUSES.includes(remoteStatus)) {
        const label = BILLING_PLANS[current.plan_code]?.name ?? "GamiBAR Pro";
        throw new HttpError(
          current.cancellation_requested_at
            ? `${label} remains active until the end of its billing period.`
            : `This account already has ${label}. Cancel it before choosing another recurring plan.`,
          409,
        );
      }
    }
  }

  const planId = razorpayPlanId(planCode);
  await validateRemotePlan(planCode, planId);
  const totalCount = planCode === "pro_monthly" ? 1_200 : 100;
  const subscription = await createRazorpaySubscription({
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: true,
    notes: {
      author_id: user.id,
      plan_code: planCode,
      billing_email: billingProfile.email,
    },
  });

  const { error } = await admin.from("gamibar_subscriptions").insert({
    author_id: user.id,
    plan_code: planCode,
    provider_plan_id: planId,
    provider_subscription_id: subscription.id,
    status: normalizeSubscriptionStatus(subscription.status),
    currency: "INR",
    base_amount_paise: plan.baseAmountPaise,
    gst_amount_paise: plan.gstAmountPaise,
    total_amount_paise: plan.totalAmountPaise,
    total_count: totalCount,
    paid_count: Number(subscription.paid_count ?? 0),
    current_start: epochToIso(subscription.current_start),
    current_end: epochToIso(subscription.current_end),
    ended_at: epochToIso(subscription.ended_at),
  });
  if (error) {
    try {
      await cancelRazorpaySubscription(subscription.id, false);
    } catch {
      // The local error is primary; the unused test subscription can be inspected in Razorpay.
    }
    throw error;
  }

  return checkoutResponse(user, plan, billingProfile, {
    subscriptionId: subscription.id,
  });
}

async function discardUnavailableCheckoutSubscription(admin, subscription, error) {
  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("gamibar_subscriptions")
    .update({
      status: "cancelled",
      ended_at: now,
      cancellation_requested_at: now,
      cancel_at_cycle_end: false,
    })
    .eq("id", subscription.id)
    .eq("status", "created");
  if (updateError) throw updateError;

  console.warn("Discarded stale checkout subscription after provider lookup failed", {
    subscriptionId: subscription.id,
    authorId: subscription.author_id,
    planCode: subscription.plan_code,
    providerStatus: error.status,
  });
}

function canDiscardUnavailableCheckoutSubscription(error, subscription) {
  if (!(error instanceof HttpError) || error.status !== 400) return false;
  if (subscription.status !== "created") return false;

  const plan = BILLING_PLANS[subscription.plan_code];
  if (!plan?.recurring) return false;

  return subscription.provider_plan_id !== razorpayPlanId(subscription.plan_code);
}

async function verifyLifetimeCheckout(user, { paymentId, signature, orderId }) {
  if (!verifyCheckoutSignature({ paymentId, orderId, signature })) {
    throw new HttpError("Payment verification failed.", 400);
  }
  const admin = createAdminClient();
  const { data: localOrder, error } = await admin
    .from("gamibar_payment_orders")
    .select("*")
    .eq("author_id", user.id)
    .eq("provider_order_id", orderId)
    .eq("plan_code", "lifetime")
    .maybeSingle();
  if (error) throw error;
  if (!localOrder) throw new HttpError("Payment order was not found.", 404);

  const [payment, order] = await Promise.all([
    fetchRazorpayPayment(paymentId),
    fetchRazorpayOrder(orderId),
  ]);
  if (
    payment.order_id !== orderId ||
    payment.status !== "captured" ||
    order.status !== "paid" ||
    Number(payment.amount) !== Number(localOrder.total_amount_paise) ||
    payment.currency !== "INR"
  ) {
    throw new HttpError("Razorpay has not confirmed this payment.", 409);
  }

  const paidAt = epochToIso(payment.created_at) ?? new Date().toISOString();
  await markOrderPaid(admin, localOrder, paymentId, paidAt);
  await upsertEntitlement(admin, {
    authorId: user.id,
    planCode: "lifetime",
    status: "active",
    source: "lifetime",
    sourceReference: paymentId,
    validUntil: null,
  });

  return { ok: true, status: "active", plan: BILLING_PLANS.lifetime };
}

async function verifySubscriptionCheckout(
  user,
  planCode,
  { paymentId, signature, subscriptionId },
) {
  if (!verifyCheckoutSignature({ paymentId, subscriptionId, signature })) {
    throw new HttpError("Subscription verification failed.", 400);
  }
  const admin = createAdminClient();
  const { data: local, error } = await admin
    .from("gamibar_subscriptions")
    .select("*")
    .eq("author_id", user.id)
    .eq("provider_subscription_id", subscriptionId)
    .eq("plan_code", planCode)
    .maybeSingle();
  if (error) throw error;
  if (!local) throw new HttpError("Subscription was not found.", 404);

  const remote = await fetchRazorpaySubscription(subscriptionId);
  if (remote.plan_id !== local.provider_plan_id) {
    throw new HttpError("Subscription plan verification failed.", 409);
  }
  const status = normalizeSubscriptionStatus(remote.status);
  if (!new Set(["authenticated", "active", "pending"]).has(status)) {
    throw new HttpError("Razorpay has not activated this subscription.", 409);
  }

  const { error: updateError } = await admin
    .from("gamibar_subscriptions")
    .update(subscriptionPatch(remote, status))
    .eq("id", local.id);
  if (updateError) throw updateError;

  await upsertEntitlement(admin, {
    authorId: user.id,
    planCode,
    status: status === "pending" ? "past_due" : "active",
    source: "subscription",
    sourceReference: subscriptionId,
    validUntil: epochToIso(remote.current_end),
  });

  return { ok: true, status, plan: BILLING_PLANS[planCode] };
}

async function applyPaymentEvent(admin, eventType, payload) {
  if (eventType.startsWith("subscription.")) {
    const subscription = payload?.payload?.subscription?.entity;
    if (!subscription?.id) return false;
    return applySubscriptionEvent(
      admin,
      eventType,
      subscription,
      payload?.payload?.payment?.entity,
    );
  }

  if (eventType === "order.paid" || eventType === "payment.captured") {
    const order = payload?.payload?.order?.entity;
    const payment = payload?.payload?.payment?.entity;
    const orderId = order?.id ?? payment?.order_id;
    if (!orderId || !payment?.id) return false;
    return applyPaidOrderEvent(admin, orderId, payment);
  }

  if (eventType === "payment.failed") {
    const payment = payload?.payload?.payment?.entity;
    if (!payment?.order_id) return false;
    await admin
      .from("gamibar_payment_orders")
      .update({ status: "failed", provider_payment_id: payment.id ?? null })
      .eq("provider_order_id", payment.order_id)
      .eq("status", "created");
    return true;
  }

  if (eventType === "refund.processed") {
    const refund = payload?.payload?.refund?.entity;
    if (!refund?.payment_id) return false;
    await markRefundProcessed(admin, refund);
    return true;
  }

  return false;
}

async function applySubscriptionEvent(admin, eventType, subscription, payment) {
  const { data: local, error } = await admin
    .from("gamibar_subscriptions")
    .select("*")
    .eq("provider_subscription_id", subscription.id)
    .maybeSingle();
  if (error) throw error;
  if (!local) return false;

  const status = normalizeSubscriptionStatus(subscription.status);
  const { error: updateError } = await admin
    .from("gamibar_subscriptions")
    .update(subscriptionPatch(subscription, status))
    .eq("id", local.id);
  if (updateError) throw updateError;

  if (eventType === "subscription.charged" && payment?.id) {
    await recordSubscriptionPayment(admin, local, payment);
  }

  if (new Set(["authenticated", "active"]).has(status)) {
    await upsertEntitlement(admin, {
      authorId: local.author_id,
      planCode: local.plan_code,
      status: "active",
      source: "subscription",
      sourceReference: local.provider_subscription_id,
      validUntil: epochToIso(subscription.current_end),
    });
  } else if (new Set(["pending", "halted", "paused"]).has(status)) {
    await upsertEntitlement(admin, {
      authorId: local.author_id,
      planCode: local.plan_code,
      status: "past_due",
      source: "subscription",
      sourceReference: local.provider_subscription_id,
      validUntil: epochToIso(subscription.current_end),
    });
  } else if (new Set(["cancelled", "completed", "expired"]).has(status)) {
    const validUntil =
      epochToIso(subscription.current_end) ?? epochToIso(subscription.ended_at);
    const stillValid =
      validUntil && new Date(validUntil).getTime() > Date.now();
    await upsertEntitlement(admin, {
      authorId: local.author_id,
      planCode: local.plan_code,
      status: stillValid
        ? "active"
        : status === "cancelled"
          ? "cancelled"
          : "expired",
      source: "subscription",
      sourceReference: local.provider_subscription_id,
      validUntil,
    });
  }
  return true;
}

async function applyPaidOrderEvent(admin, orderId, payment) {
  const { data: localOrder, error } = await admin
    .from("gamibar_payment_orders")
    .select("*")
    .eq("provider_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!localOrder) return false;
  if (
    Number(payment.amount) !== Number(localOrder.total_amount_paise) ||
    payment.currency !== "INR"
  ) {
    throw new Error(
      "Razorpay order amount does not match the local payment ledger.",
    );
  }
  const paidAt = epochToIso(payment.created_at) ?? new Date().toISOString();
  await markOrderPaid(admin, localOrder, payment.id, paidAt);
  if (localOrder.plan_code === "lifetime") {
    await upsertEntitlement(admin, {
      authorId: localOrder.author_id,
      planCode: "lifetime",
      status: "active",
      source: "lifetime",
      sourceReference: payment.id,
      validUntil: null,
    });
  }
  return true;
}

async function recordSubscriptionPayment(admin, subscription, payment) {
  if (!payment.order_id || !payment.id) return;
  const plan = BILLING_PLANS[subscription.plan_code];
  const tax = taxBreakdown();
  const paidAt = epochToIso(payment.created_at) ?? new Date().toISOString();
  const receipt = createReceipt(
    subscription.author_id,
    `sub${subscription.id}`,
  );
  const { error } = await admin.from("gamibar_payment_orders").upsert(
    {
      author_id: subscription.author_id,
      subscription_id: subscription.id,
      plan_code: subscription.plan_code,
      provider_order_id: payment.order_id,
      provider_payment_id: payment.id,
      receipt,
      invoice_number: invoiceNumber(payment.id, paidAt),
      status: "paid",
      currency: "INR",
      base_amount_paise: plan.baseAmountPaise,
      gst_rate_bps: GST_RATE_BPS,
      ...tax,
      total_amount_paise: plan.totalAmountPaise,
      paid_at: paidAt,
      refund_eligible_until: new Date(
        new Date(paidAt).getTime() + REFUND_WINDOW_MS,
      ).toISOString(),
    },
    { onConflict: "provider_order_id" },
  );
  if (error) throw error;
}

async function markOrderPaid(admin, localOrder, paymentId, paidAt) {
  const { error } = await admin
    .from("gamibar_payment_orders")
    .update({
      provider_payment_id: paymentId,
      status: "paid",
      invoice_number:
        localOrder.invoice_number ?? invoiceNumber(paymentId, paidAt),
      paid_at: paidAt,
      refund_eligible_until: new Date(
        new Date(paidAt).getTime() + REFUND_WINDOW_MS,
      ).toISOString(),
    })
    .eq("id", localOrder.id);
  if (error) throw error;
}

async function markRefundProcessed(admin, refund) {
  const { data: payment, error } = await admin
    .from("gamibar_payment_orders")
    .select("*")
    .eq("provider_payment_id", refund.payment_id)
    .maybeSingle();
  if (error) throw error;
  if (!payment) return;
  const refundedAt = epochToIso(refund.created_at) ?? new Date().toISOString();
  await admin
    .from("gamibar_payment_orders")
    .update({ status: "refunded", refunded_at: refundedAt })
    .eq("id", payment.id);
  await admin
    .from("gamibar_refund_requests")
    .update({
      status: "processed",
      provider_refund_id: refund.id,
      resolved_at: refundedAt,
    })
    .eq("payment_order_id", payment.id);
  if (payment.plan_code === "lifetime") {
    await upsertEntitlement(admin, {
      authorId: payment.author_id,
      planCode: "lifetime",
      status: "refunded",
      source: "lifetime",
      sourceReference: refund.id,
      validUntil: null,
    });
  }
}

async function upsertEntitlement(
  admin,
  { authorId, planCode, status, source, sourceReference, validUntil },
) {
  const { error } = await admin.from("gamibar_entitlements").upsert(
    {
      author_id: authorId,
      plan_code: planCode,
      status,
      source,
      source_reference: sourceReference,
      valid_until: validUntil,
    },
    { onConflict: "author_id" },
  );
  if (error) throw error;
}

async function fetchEffectiveEntitlement(admin, authorId) {
  const { data, error } = await admin
    .from("gamibar_entitlements")
    .select("*")
    .eq("author_id", authorId)
    .maybeSingle();
  if (error) throw error;
  return effectiveEntitlement(data);
}

function effectiveEntitlement(row) {
  if (!row || !PAID_ENTITLEMENT_STATUSES.has(row.status)) {
    return {
      planCode: "free",
      status: "active",
      validUntil: null,
      source: "free",
    };
  }
  if (row.valid_until && new Date(row.valid_until).getTime() <= Date.now()) {
    return {
      planCode: "free",
      status: "active",
      validUntil: null,
      source: "free",
    };
  }
  return {
    planCode: row.plan_code,
    status: row.status,
    validUntil: row.valid_until,
    source: row.source,
  };
}

async function validateRemotePlan(planCode, planId) {
  const cached = planValidationCache.get(planId);
  if (cached && cached > Date.now()) return;
  const plan = BILLING_PLANS[planCode];
  const remote = await fetchRazorpayPlan(planId);
  const expectedPeriod = planCode === "pro_monthly" ? "monthly" : "yearly";
  if (
    remote.period !== expectedPeriod ||
    Number(remote.interval) !== 1 ||
    remote.item?.currency !== "INR" ||
    Number(remote.item?.amount) !== plan.totalAmountPaise
  ) {
    throw new HttpError(
      "The configured Razorpay plan does not match GamiBAR pricing.",
      503,
    );
  }
  planValidationCache.set(planId, Date.now() + PLAN_CACHE_MS);
}

function checkoutResponse(user, plan, billingProfile, reference) {
  return {
    checkout: {
      keyId: publicRazorpayKeyId(),
      ...reference,
      amount: plan.totalAmountPaise,
      currency: "INR",
      name: "GamiBAR",
      description: plan.description,
      prefill: {
        name: billingProfile.legal_name,
        email: billingProfile.email || user.email || "",
        contact: billingProfile.phone ?? "",
      },
      notes: { plan_code: plan.code },
    },
    plan,
  };
}

function validateBillingProfile(user, input) {
  const legalName = stringValue(
    input?.legalName ??
      user.user_metadata?.display_name ??
      user.user_metadata?.name ??
      "Customer",
    "legalName",
    120,
  ).trim();
  const email = stringValue(input?.email ?? user.email, "email", 320)
    .trim()
    .toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email))
    throw new HttpError("Enter a valid billing email.", 400);
  const stateCode = stringValue(input?.stateCode, "stateCode", 2)
    .trim()
    .toUpperCase();
  if (!INDIA_STATE_CODES.has(stateCode))
    throw new HttpError("Choose a valid Indian state.", 400);

  const phone = optionalString(input?.phone, 20);
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const postalCode = optionalString(input?.postalCode, 6);
  if (postalCode && !/^[0-9]{6}$/.test(postalCode)) {
    throw new HttpError("Enter a valid six-digit PIN code.", 400);
  }

  return {
    legal_name: legalName,
    email,
    phone: normalizedPhone,
    gstin: null,
    address_line_1: optionalString(input?.addressLine1, 200),
    address_line_2: optionalString(input?.addressLine2, 200),
    city: optionalString(input?.city, 100),
    state_code: stateCode,
    postal_code: postalCode,
    country_code: "IN",
  };
}

function taxBreakdown() {
  return {
    cgst_amount_paise: 0,
    sgst_amount_paise: 0,
    igst_amount_paise: 0,
  };
}

function subscriptionPatch(subscription, fallbackStatus) {
  return {
    status: normalizeSubscriptionStatus(subscription.status ?? fallbackStatus),
    paid_count: Number(subscription.paid_count ?? 0),
    current_start: epochToIso(subscription.current_start),
    current_end: epochToIso(subscription.current_end),
    ended_at: epochToIso(subscription.ended_at),
  };
}

function normalizeSubscriptionStatus(value) {
  const status = String(value ?? "created").toLowerCase();
  return new Set([
    "created",
    "authenticated",
    "active",
    "pending",
    "halted",
    "paused",
    "cancelled",
    "completed",
    "expired",
  ]).has(status)
    ? status
    : "created";
}

function serializeBillingProfile(profile) {
  return {
    legalName: profile.legal_name,
    email: profile.email,
    phone: profile.phone,
    gstin: profile.gstin,
    addressLine1: profile.address_line_1,
    addressLine2: profile.address_line_2,
    city: profile.city,
    stateCode: profile.state_code,
    postalCode: profile.postal_code,
    countryCode: profile.country_code,
  };
}

function serializeCurrentSubscription(rows) {
  const row =
    rows.find((subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status),
    ) ?? rows[0];
  if (!row) return null;
  return {
    planCode: row.plan_code,
    status: row.status,
    currentStart: row.current_start,
    currentEnd: row.current_end,
    cancellationRequestedAt: row.cancellation_requested_at,
    cancelAtCycleEnd: row.cancel_at_cycle_end,
  };
}

function serializePayment(payment) {
  return {
    id: payment.id,
    planCode: payment.plan_code,
    status: payment.status,
    invoiceNumber: payment.invoice_number,
    currency: payment.currency,
    baseAmountPaise: Number(payment.base_amount_paise),
    cgstAmountPaise: Number(payment.cgst_amount_paise),
    sgstAmountPaise: Number(payment.sgst_amount_paise),
    igstAmountPaise: Number(payment.igst_amount_paise),
    totalAmountPaise: Number(payment.total_amount_paise),
    paidAt: payment.paid_at,
    refundEligibleUntil: payment.refund_eligible_until,
    refundedAt: payment.refunded_at,
  };
}

function serializeRefund(refund) {
  return {
    id: refund.id,
    paymentOrderId: refund.payment_order_id,
    status: refund.status,
    reason: refund.reason,
    requestedAmountPaise: Number(refund.requested_amount_paise),
    resolutionNote: refund.resolution_note,
    resolvedAt: refund.resolved_at,
    createdAt: refund.created_at,
  };
}

async function getMonthlyAiUsage(admin, authorId) {
  const { data, error } = await admin
    .from("gamibar_usage_counters")
    .select("usage_count")
    .eq("author_id", authorId)
    .eq("usage_key", "ai_generation")
    .eq("period_start", monthStartUtc())
    .maybeSingle();
  if (error) throw error;
  return Number(data?.usage_count ?? 0);
}

function assertBillingConfiguration() {
  const configuredGst = Number.parseInt(
    process.env.RAZORPAY_GST_RATE_BPS ?? "0",
    10,
  );
  if (configuredGst !== GST_RATE_BPS) {
    throw new HttpError(
      "The configured tax rate does not match GamiBAR pricing.",
      503,
    );
  }
}

function createReceipt(authorId, suffix) {
  const time = Date.now().toString(36);
  return `gb_${authorId.replaceAll("-", "").slice(0, 8)}_${String(suffix).slice(0, 8)}_${time}`.slice(
    0,
    40,
  );
}

function invoiceNumber(paymentId, paidAt) {
  const date = new Date(paidAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `GB-${year}${month}-${paymentId.slice(-8).toUpperCase()}`;
}

function epochToIso(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}

function monthStartUtc() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `+91${digits}` : `+${digits}`;
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new HttpError("Enter a valid billing phone number.", 400);
  }
  return normalized;
}

function stringValue(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(`${field} is required.`, 400);
  }
  if (value.trim().length > maxLength)
    throw new HttpError(`${field} is too long.`, 400);
  return value.trim();
}

function optionalString(value, maxLength) {
  if (value == null || value === "") return null;
  if (typeof value !== "string")
    throw new HttpError("Invalid billing details.", 400);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength)
    throw new HttpError("Billing detail is too long.", 400);
  return normalized;
}

function positiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new HttpError(`${field} is invalid.`, 400);
  return parsed;
}

function throwFirstError(results) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
