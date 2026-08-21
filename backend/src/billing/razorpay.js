import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpError } from "../http-error.js";

const API_BASE_URL = "https://api.razorpay.com/v1";
const REQUEST_TIMEOUT_MS = 12_000;

export function publicRazorpayKeyId() {
  return requiredEnv("RAZORPAY_KEY_ID");
}

export function razorpayPlanId(planCode) {
  if (planCode === "pro_monthly") return requiredEnv("RAZORPAY_PLAN_MONTHLY_ID");
  if (planCode === "pro_yearly") return requiredEnv("RAZORPAY_PLAN_YEARLY_ID");
  throw new HttpError("That subscription plan is not available.", 400);
}

export async function createRazorpayOrder(options) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: options,
  });
}

export async function fetchRazorpayOrder(orderId) {
  assertProviderId(orderId, "order_");
  return razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);
}

export async function fetchRazorpayPayment(paymentId) {
  assertProviderId(paymentId, "pay_");
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function createRazorpaySubscription(options) {
  return razorpayRequest("/subscriptions", {
    method: "POST",
    body: options,
  });
}

export async function fetchRazorpayPlan(planId) {
  assertProviderId(planId, "plan_");
  return razorpayRequest(`/plans/${encodeURIComponent(planId)}`);
}

export async function fetchRazorpaySubscription(subscriptionId) {
  assertProviderId(subscriptionId, "sub_");
  return razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function cancelRazorpaySubscription(subscriptionId, cancelAtCycleEnd = true) {
  assertProviderId(subscriptionId, "sub_");
  return razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 },
  });
}

export function verifyCheckoutSignature({
  paymentId,
  orderId,
  subscriptionId,
  signature,
}) {
  assertProviderId(paymentId, "pay_");
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;

  const message = subscriptionId
    ? `${paymentId}|${assertProviderId(subscriptionId, "sub_")}`
    : `${assertProviderId(orderId, "order_")}|${paymentId}`;
  const expected = createHmac("sha256", requiredEnv("RAZORPAY_KEY_SECRET"))
    .update(message)
    .digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!Buffer.isBuffer(rawBody)) return false;
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const secret = requiredEnv("RAZORPAY_WEBHOOK_SECRET");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export function webhookSecretConfigured() {
  const value = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  return Boolean(value && !/^replace_/i.test(value));
}

async function razorpayRequest(path, { method = "GET", body } = {}) {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timeout.unref?.();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError("The payment provider took too long to respond. Please retry.", 504);
    }
    throw new HttpError("The payment provider is temporarily unavailable.", 502);
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload?.error?.description;
    if (response.status === 401) {
      console.error("Razorpay authentication failed. Check the server-only API credentials.");
      throw new HttpError("Payments are temporarily unavailable.", 503);
    }
    if (response.status === 429) {
      throw new HttpError("Too many payment requests. Wait a moment and retry.", 429);
    }
    console.error("Razorpay API error", {
      status: response.status,
      code: payload?.error?.code,
      description: providerMessage,
    });
    throw new HttpError(
      response.status >= 500
        ? "The payment provider is temporarily unavailable."
        : providerMessage || "The payment request could not be completed.",
      response.status >= 500 ? 502 : 400,
    );
  }
  return payload;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value || /^replace_/i.test(value)) {
    throw new HttpError("Payments are not fully configured yet.", 503);
  }
  return value;
}

function assertProviderId(value, prefix) {
  if (typeof value !== "string" || !new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(value)) {
    throw new HttpError("Invalid payment reference.", 400);
  }
  return value;
}

function safeEqual(expected, received) {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(received, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
