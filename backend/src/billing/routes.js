import { rateLimit } from "express-rate-limit";

import { requireAuthor } from "../auth.js";
import { HttpError } from "../http-error.js";
import {
  cancelCurrentSubscription,
  createCheckout,
  getBillingStatus,
  persistPaymentEvent,
  processPaymentEvent,
  processPendingPaymentEvents,
  requestRefund,
  verifyCheckout,
} from "./service.js";
import {
  verifyWebhookSignature,
  webhookSecretConfigured,
} from "./razorpay.js";

const checkoutLimiter = billingLimiter(10, 60 * 60 * 1000);
const verifyLimiter = billingLimiter(30, 15 * 60 * 1000);
const refundLimiter = billingLimiter(5, 24 * 60 * 60 * 1000);
let billingWorkerTimer;

export function registerBillingWebhookRoute(app) {
  app.post("/api/billing/webhook", async (req, res, next) => {
    try {
      if (!webhookSecretConfigured()) {
        throw new HttpError("Payment webhooks are not configured.", 503);
      }
      const signature = req.get("x-razorpay-signature") ?? "";
      if (!verifyWebhookSignature(req.body, signature)) {
        throw new HttpError("Invalid webhook signature.", 401);
      }
      const eventId = req.get("x-razorpay-event-id")?.trim();
      if (!eventId || eventId.length > 100) {
        throw new HttpError("Missing webhook event identifier.", 400);
      }

      let payload;
      try {
        payload = JSON.parse(req.body.toString("utf8"));
      } catch {
        throw new HttpError("Invalid webhook payload.", 400);
      }
      const eventType = typeof payload?.event === "string" ? payload.event : "";
      if (!eventType || eventType.length > 100) {
        throw new HttpError("Invalid webhook event type.", 400);
      }

      const stored = await persistPaymentEvent({ eventId, eventType, payload });
      res.status(stored.duplicate ? 200 : 202).json({ ok: true });
      if (!stored.duplicate) {
        setImmediate(() => {
          void processPaymentEvent(eventId).catch((error) => {
            console.error("Razorpay webhook processing failed", {
              eventId,
              message: error instanceof Error ? error.message : "Unknown error",
            });
          });
        });
      }
    } catch (error) {
      next(error);
    }
  });
}

export function registerBillingRoutes(app) {
  app.get("/api/billing/status", async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.json(await getBillingStatus(user));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/billing/checkout", checkoutLimiter, async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.status(201).json(await createCheckout(user, req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/billing/verify", verifyLimiter, async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.json(await verifyCheckout(user, req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/billing/cancel", checkoutLimiter, async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.json(await cancelCurrentSubscription(user));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/billing/refunds", refundLimiter, async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.status(201).json(await requestRefund(user, req.body));
    } catch (error) {
      next(error);
    }
  });
}

export function scheduleBillingWebhookProcessing() {
  if (!webhookSecretConfigured() || billingWorkerTimer) return;
  const processPending = () => {
    void processPendingPaymentEvents().catch((error) => {
      console.error(
        error instanceof Error
          ? `Billing webhook worker skipped: ${error.message}`
          : "Billing webhook worker skipped.",
      );
    });
  };
  const startupTimer = setTimeout(processPending, 5_000);
  startupTimer.unref?.();
  billingWorkerTimer = setInterval(processPending, 30_000);
  billingWorkerTimer.unref?.();
}

function billingLimiter(limit, windowMs) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    validate: { trustProxy: false },
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many billing requests. Please wait and try again." });
    },
  });
}
