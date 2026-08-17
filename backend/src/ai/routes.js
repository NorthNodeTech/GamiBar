import { requireUser } from "../auth.js";
import { generateAiOptions } from "./option-generator.js";
import { configuredAiProviderIds } from "./providers/index.js";

export function registerAiRoutes(app) {
  app.get("/api/ai/providers", async (req, res, next) => {
    try {
      await requireUser(req);
      res.json({ providers: configuredAiProviderIds() });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/ai/generate-options", async (req, res, next) => {
    try {
      await requireUser(req);
      const result = await generateAiOptions(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });
}
