import "./load-env.js";

import cors from "cors";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { randomUUID } from "node:crypto";

import { HttpError } from "./http-error.js";
import { registerAuthRoutes } from "./auth.js";
import { registerAiRoutes } from "./ai/routes.js";
import {
  registerBillingRoutes,
  registerBillingWebhookRoute,
  scheduleBillingWebhookProcessing,
} from "./billing/routes.js";
import { registerGameRoutes } from "./game-api.js";
import {
  registerSessionFileRoutes,
  scheduleSessionFileCleanup,
} from "./session-files.js";
import { checkSupabaseReadiness } from "./supabase-admin.js";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const maxInFlight = positiveInteger(process.env.MAX_IN_FLIGHT_REQUESTS, 100);
const maxConcurrentRoomCreations = positiveInteger(
  process.env.MAX_CONCURRENT_ROOM_CREATIONS,
  4,
);
const maxConcurrentUploads = positiveInteger(
  process.env.MAX_CONCURRENT_UPLOADS,
  2,
);
const apiRateLimitPer15Minutes = positiveInteger(
  process.env.API_RATE_LIMIT_PER_15_MINUTES,
  200_000,
);
let inFlight = 0;
let readinessPromise;
let readinessResult = { checkedAt: 0, ok: false };

validateRuntimeConfig();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const suppliedRequestId = req.get("x-request-id")?.trim() ?? "";
  const requestId = /^[A-Za-z0-9._-]{1,100}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
  res.setHeader("x-request-id", requestId);
  res.setHeader("cache-control", "no-store");
  next();
});
app.use(cors({ origin: corsOrigin() }));
app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (durationMs >= 2_000 || res.statusCode >= 500) {
      console.info("API request", {
        requestId: res.getHeader("x-request-id"),
        method: req.method,
        path: req.originalUrl?.split("?")[0],
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    }
  });

  if (
    req.path !== "/api/health" &&
    req.path !== "/api/ready" &&
    inFlight >= maxInFlight
  ) {
    res.setHeader("retry-after", "1");
    res.status(503).json({
      error: "GamiBar is busy. Please retry in a moment.",
      requestId: res.getHeader("x-request-id"),
    });
    return;
  }

  inFlight += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    inFlight = Math.max(0, inFlight - 1);
  };
  res.once("finish", release);
  res.once("close", release);
  next();
});
app.use(
  "/api/billing/webhook",
  express.raw({ type: "application/json", limit: "512kb" }),
);
registerBillingWebhookRoute(app);
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    // A whole classroom can share one public IP. Keep this only as a coarse
    // abuse ceiling and enforce tighter limits on sensitive endpoints.
    limit: apiRateLimitPer15Minutes,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: (req) => req.path === "/health" || req.path === "/ready",
    handler: (_req, res) => {
      res
        .status(429)
        .json({ error: "Too many requests. Please wait and try again." });
    },
  }),
);
app.use(
  "/api/game/create-room",
  concurrencyGate(
    maxConcurrentRoomCreations,
    "Too many rooms are being prepared. Please retry in a moment.",
  ),
  express.json({ limit: "15mb" }),
);
app.use(
  "/api/session-files/upload",
  concurrencyGate(
    maxConcurrentUploads,
    "File uploads are busy. Please retry in a moment.",
  ),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gamibar-api",
    version: process.env.RENDER_GIT_COMMIT?.slice(0, 12) || "local",
    uptimeSeconds: Math.floor(process.uptime()),
    inFlight,
  });
});

app.get("/api/ready", async (_req, res) => {
  try {
    await databaseReady();
    res.json({ ok: true, service: "gamibar-api", database: "ready" });
  } catch {
    res
      .status(503)
      .json({ ok: false, service: "gamibar-api", database: "unavailable" });
  }
});

registerAiRoutes(app);
registerAuthRoutes(app);
registerBillingRoutes(app);
registerSessionFileRoutes(app);
registerGameRoutes(app);
scheduleSessionFileCleanup();
scheduleBillingWebhookProcessing();

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
    requestId: res.getHeader("x-request-id"),
    path: req.path,
  });
});

app.use((err, req, res, _next) => {
  const requestId = res.getHeader("x-request-id");
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each document must be 50 MB or smaller."
        : err.code === "LIMIT_FILE_COUNT"
          ? "A resource drop can hold one active document."
          : "The uploaded documents could not be processed.";
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: message, requestId });
    return;
  }

  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "The request is too large.", requestId });
    return;
  }

  if (err?.type === "entity.parse.failed") {
    res
      .status(400)
      .json({ error: "The request body is not valid JSON.", requestId });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof HttpError ? err.message : "GamiBar API request failed.";
  if (!(err instanceof HttpError)) {
    console.error("Unhandled API error", {
      requestId,
      method: req.method,
      path: req.originalUrl?.split("?")[0],
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
  res.status(status).json({ error: message, requestId });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`GamiBar API listening on ${port}`);
});

server.keepAliveTimeout = positiveInteger(
  process.env.KEEP_ALIVE_TIMEOUT_MS,
  65_000,
);
server.headersTimeout = positiveInteger(process.env.HEADERS_TIMEOUT_MS, 70_000);
server.requestTimeout = positiveInteger(
  process.env.REQUEST_TIMEOUT_MS,
  180_000,
);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    console.log(`${signal} received; draining HTTP requests.`);
    const forceExitTimer = setTimeout(() => process.exit(1), 35_000);
    forceExitTimer.unref();
    server.close((error) => {
      clearTimeout(forceExitTimer);
      if (error) {
        console.error(error);
        process.exit(1);
      }
      process.exit(0);
    });
  });
}

function corsOrigin() {
  const raw = process.env.CORS_ORIGIN;
  const productionOrigins = [
    "https://gamibar.com",
    "https://www.gamibar.com",
    "https://gamibar.onrender.com",
  ];
  const devOrigins = [
    "http://localhost:8080",
    "http://localhost:8082",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  const configured =
    raw && !/placeholder|your-render/i.test(raw) ? raw.split(",") : [];
  const allowed = configured
    .map(normalizeOrigin)
    .filter((origin) => origin !== null);

  for (const origin of productionOrigins) {
    if (!allowed.includes(origin)) allowed.push(origin);
  }

  if (process.env.NODE_ENV !== "production") {
    for (const origin of devOrigins) {
      if (!allowed.includes(origin)) {
        allowed.push(origin);
      }
    }
  }
  return allowed;
}

function normalizeOrigin(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function concurrencyGate(limit, message) {
  let active = 0;
  return (_req, res, next) => {
    if (active >= limit) {
      res.setHeader("retry-after", "2");
      res.status(503).json({
        error: message,
        requestId: res.getHeader("x-request-id"),
      });
      return;
    }

    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active = Math.max(0, active - 1);
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  };
}

function databaseReady() {
  const now = Date.now();
  if (now - readinessResult.checkedAt < 15_000) {
    return readinessResult.ok
      ? Promise.resolve()
      : Promise.reject(new Error("Database is unavailable."));
  }
  if (readinessPromise) return readinessPromise;

  readinessPromise = checkSupabaseReadiness()
    .then(() => {
      readinessResult = { checkedAt: Date.now(), ok: true };
    })
    .catch((error) => {
      readinessResult = { checkedAt: Date.now(), ok: false };
      throw error;
    })
    .finally(() => {
      readinessPromise = undefined;
    });
  return readinessPromise;
}

function validateRuntimeConfig() {
  const errors = [];
  const optionalWarnings = [];
  const isProduction = process.env.NODE_ENV === "production";
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  try {
    const parsed = new URL(supabaseUrl);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".supabase.co")
    ) {
      errors.push("SUPABASE_URL must be an HTTPS Supabase project URL");
    }
  } catch {
    errors.push("SUPABASE_URL is missing or invalid");
  }
  if (!serviceRoleKey || /replace|placeholder|your_/i.test(serviceRoleKey)) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is missing");
  }

  if (isProduction) {
    const requiredPayments = [
      ["RAZORPAY_KEY_ID", /^rzp_(?:test|live)_[A-Za-z0-9]+$/],
      ["RAZORPAY_KEY_SECRET", /^.{16,}$/],
      ["RAZORPAY_PLAN_MONTHLY_ID", /^plan_[A-Za-z0-9]+$/],
      ["RAZORPAY_PLAN_YEARLY_ID", /^plan_[A-Za-z0-9]+$/],
      ["RAZORPAY_WEBHOOK_SECRET", /^.{16,}$/],
    ];
    for (const [name, pattern] of requiredPayments) {
      const value = process.env[name]?.trim() ?? "";
      if (!pattern.test(value) || /replace|placeholder|your_/i.test(value)) {
        optionalWarnings.push(`${name} is missing or invalid`);
      }
    }

    if (
      ![
        process.env.GEMINI_API_KEY,
        process.env.OPENROUTER_API_KEY,
        process.env.NVIDIA_API_KEY,
        process.env.NIM_API_KEY,
      ].some((value) => value?.trim() && !/replace|placeholder|your_/i.test(value))
    ) {
      optionalWarnings.push("no AI provider key is configured");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid backend configuration: ${errors.join("; ")}.`);
  }

  for (const warning of optionalWarnings) {
    console.warn(
      `Optional author feature unavailable: ${warning}. Public joining and gameplay remain enabled.`,
    );
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  if (isProduction && razorpayKeyId.startsWith("rzp_test_")) {
    console.warn(
      "Razorpay is configured in TEST mode; real charges are disabled.",
    );
  }
}

function positiveInteger(raw, fallback) {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
