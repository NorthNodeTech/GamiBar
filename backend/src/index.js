import "dotenv/config";

import cors from "cors";
import express from "express";
import multer from "multer";

import { HttpError } from "./http-error.js";
import { registerGameRoutes } from "./game-api.js";
import {
  registerSessionFileRoutes,
  scheduleSessionFileCleanup,
} from "./session-files.js";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "8787", 10);

app.disable("x-powered-by");
app.use(cors({ origin: corsOrigin() }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gamibar-api" });
});

registerSessionFileRoutes(app);
registerGameRoutes(app);
scheduleSessionFileCleanup();

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each document must be 50 MB or smaller."
        : err.code === "LIMIT_FILE_COUNT"
          ? "A resource drop can hold up to 10 active documents."
          : "The uploaded documents could not be processed.";
    res.status(400).json({ error: message });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof HttpError ? err.message : "GamiBar API request failed.";
  if (!(err instanceof HttpError)) {
    console.error(err);
  }
  res.status(status).json({ error: message });
});

app.listen(port, () => {
  console.log(`GamiBar API listening on ${port}`);
});

function corsOrigin() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return allowed.length > 0 ? allowed : true;
}
