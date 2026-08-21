import "../src/load-env.js";

import { createHmac } from "node:crypto";

import { getBillingStatus } from "../src/billing/service.js";
import {
  fetchRazorpayPlan,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../src/billing/razorpay.js";
import { createAdminClient } from "../src/supabase-admin.js";

const secret = process.env.RAZORPAY_KEY_SECRET;
if (!secret) throw new Error("Razorpay test credentials are not configured.");

const paymentId = "pay_test123";
const orderId = "order_test123";
const subscriptionId = "sub_test123";
const orderSignature = signature(`${orderId}|${paymentId}`);
const subscriptionSignature = signature(`${paymentId}|${subscriptionId}`);
const webhookBody = Buffer.from('{"event":"payment.captured"}', "utf8");
const webhookSignature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(webhookBody)
  .digest("hex");

const [monthly, yearly] = await Promise.all([
  fetchRazorpayPlan(process.env.RAZORPAY_PLAN_MONTHLY_ID),
  fetchRazorpayPlan(process.env.RAZORPAY_PLAN_YEARLY_ID),
]);

const admin = createAdminClient();
const { data: author, error } = await admin
  .from("gamibar_authors")
  .select("id")
  .limit(1)
  .maybeSingle();
if (error) throw error;

const billing = author
  ? await getBillingStatus({ id: author.id, email: "", user_metadata: {} })
  : null;

const result = {
  checkoutSignature: verifyCheckoutSignature({ paymentId, orderId, signature: orderSignature }),
  subscriptionSignature: verifyCheckoutSignature({
    paymentId,
    subscriptionId,
    signature: subscriptionSignature,
  }),
  tamperedSignatureRejected: !verifyCheckoutSignature({
    paymentId,
    orderId,
    signature: "0".repeat(64),
  }),
  webhookSignature: verifyWebhookSignature(webhookBody, webhookSignature),
  tamperedWebhookRejected: !verifyWebhookSignature(webhookBody, "0".repeat(64)),
  monthlyPlan: { amountPaise: Number(monthly.item?.amount), period: monthly.period },
  yearlyPlan: { amountPaise: Number(yearly.item?.amount), period: yearly.period },
  liveBillingRead: billing
    ? { planCode: billing.currentPlan.code, paymentCount: billing.payments.length }
    : { planCode: null, paymentCount: 0 },
};

console.log(JSON.stringify(result));

if (
  !result.checkoutSignature ||
  !result.subscriptionSignature ||
  !result.tamperedSignatureRejected ||
  !result.webhookSignature ||
  !result.tamperedWebhookRejected ||
  result.monthlyPlan.amountPaise !== 4_900 ||
  result.monthlyPlan.period !== "monthly" ||
  result.yearlyPlan.amountPaise !== 49_900 ||
  result.yearlyPlan.period !== "yearly"
) {
  throw new Error("Billing smoke test failed.");
}

function signature(value) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
