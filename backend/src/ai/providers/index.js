import { HttpError } from "../../http-error.js";
import { geminiProvider } from "./gemini.js";
import { nvidiaProvider } from "./nvidia.js";
import { openRouterProvider } from "./openrouter.js";

const PROVIDERS = [geminiProvider, openRouterProvider, nvidiaProvider];
const DEFAULT_PROVIDER_ORDER = ["gemini", "openrouter", "nvidia"];
const DEFAULT_GENERATION_TIMEOUT_MS = 85_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;

export async function generateJsonWithAiProviders(request) {
  const orderedProviders = providerOrder();
  const configured = orderedProviders.filter((provider) => provider.isConfigured());

  if (configured.length === 0) {
    throw new HttpError(
      "Configure at least one AI provider key: OPENROUTER_API_KEY, NVIDIA_API_KEY, or GEMINI_API_KEY.",
      503,
    );
  }

  let lastError;
  const deadline = Date.now() + generationTimeoutMs();
  for (const provider of configured) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 1_000) break;
    try {
      const text = await provider.generateJson({
        ...request,
        timeoutMs: Math.min(providerTimeoutMs(), remainingMs),
      });
      if (text?.trim()) {
        return { provider: provider.id, text };
      }
    } catch (err) {
      lastError = err;
      console.warn("AI provider attempt failed", {
        provider: provider.id,
        name: err instanceof Error ? err.name : "UnknownError",
        message: err instanceof Error ? err.message : "Unknown provider error",
      });
    }
  }

  if (Date.now() >= deadline) {
    throw new HttpError("AI generation took too long. Please try again.", 504);
  }
  throw new HttpError(lastError?.message || "All configured AI providers failed.", 502);
}

export function configuredAiProviderIds() {
  return providerOrder()
    .filter((provider) => provider.isConfigured())
    .map((provider) => provider.id);
}

function providerOrder() {
  const ids = (process.env.AI_PROVIDER_ORDER?.trim()
    ? process.env.AI_PROVIDER_ORDER.split(",")
    : DEFAULT_PROVIDER_ORDER
  )
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);

  const providersById = new Map(PROVIDERS.map((provider) => [provider.id, provider]));
  return ids
    .map((id) => providersById.get(id))
    .filter(Boolean)
    .concat(PROVIDERS.filter((provider) => !ids.includes(provider.id)));
}

function generationTimeoutMs() {
  return boundedTimeout(
    process.env.AI_GENERATION_TIMEOUT_MS,
    DEFAULT_GENERATION_TIMEOUT_MS,
    15_000,
    150_000,
  );
}

function providerTimeoutMs() {
  return boundedTimeout(
    process.env.AI_PROVIDER_TIMEOUT_MS,
    DEFAULT_PROVIDER_TIMEOUT_MS,
    5_000,
    60_000,
  );
}

function boundedTimeout(raw, fallback, minimum, maximum) {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}
