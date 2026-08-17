import { HttpError } from "../../http-error.js";
import { geminiProvider } from "./gemini.js";
import { nvidiaProvider } from "./nvidia.js";
import { openRouterProvider } from "./openrouter.js";

const PROVIDERS = [geminiProvider, openRouterProvider, nvidiaProvider];
const DEFAULT_PROVIDER_ORDER = ["gemini", "openrouter", "nvidia"];

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
  for (const provider of configured) {
    try {
      const text = await provider.generateJson(request);
      if (text?.trim()) {
        return { provider: provider.id, text };
      }
    } catch (err) {
      lastError = err;
      console.error(`${provider.label} AI provider failed`, err);
    }
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
