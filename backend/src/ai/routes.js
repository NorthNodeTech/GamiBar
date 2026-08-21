import { rateLimit } from "express-rate-limit";

import { requireAuthor } from "../auth.js";
import {
  acquireAiGenerationLease,
  assertAiGenerationAvailable,
  consumeAiGeneration,
  releaseAiGenerationLease,
} from "../billing/service.js";
import { HttpError } from "../http-error.js";
import { generateAiOptions } from "./option-generator.js";
import { generateAiQuestion } from "./question-generator.js";
import { configuredAiProviderIds } from "./providers/index.js";

const activeAiAuthors = new Set();
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (_req, res) => {
    res
      .status(429)
      .json({
        error: "GamiBAR AI needs a short break. Please wait and try again.",
      });
  },
});

export function registerAiRoutes(app) {
  app.get("/api/ai/providers", async (req, res, next) => {
    try {
      await requireAuthor(req);
      res.json({ providers: configuredAiProviderIds() });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/ai/generate-options", aiLimiter, async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.json(
        await runAiGeneration(user.id, () => generateAiOptions(req.body)),
      );
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/ai/generate-question", aiLimiter, async (req, res, next) => {
    try {
      const user = await requireAuthor(req);
      res.json(
        await runAiGeneration(user.id, () => generateAiQuestion(req.body)),
      );
    } catch (err) {
      next(err);
    }
  });
}

async function runAiGeneration(authorId, generate) {
  if (activeAiAuthors.has(authorId)) {
    throw new HttpError(
      "Wait for the current AI generation to finish before starting another.",
      429,
    );
  }
  activeAiAuthors.add(authorId);
  let leaseAcquired = false;
  try {
    await acquireAiGenerationLease(authorId);
    leaseAcquired = true;
    await assertAiGenerationAvailable(authorId);
    const result = await generate();
    const usage = await consumeAiGeneration(authorId);
    return { ...result, usage };
  } finally {
    if (leaseAcquired) {
      try {
        await releaseAiGenerationLease(authorId);
      } catch (error) {
        console.error("Could not release AI generation lease", {
          authorId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    activeAiAuthors.delete(authorId);
  }
}
