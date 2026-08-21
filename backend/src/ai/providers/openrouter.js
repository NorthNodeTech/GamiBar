import {
  callOpenAiCompatibleProvider,
  jsonSchemaResponseFormat,
} from "./openai-compatible.js";

const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const openRouterProvider = {
  id: "openrouter",
  label: "OpenRouter",
  isConfigured() {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  },
  async generateJson({ prompt, schema, schemaName, timeoutMs }) {
    const headers = {};
    const referer = process.env.OPENROUTER_SITE_URL?.trim();
    const title = process.env.OPENROUTER_APP_NAME?.trim();
    if (referer) headers["HTTP-Referer"] = referer;
    if (title) headers["X-OpenRouter-Title"] = title;

    return callOpenAiCompatibleProvider({
      baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY.trim(),
      model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
      prompt,
      schema,
      schemaName,
      timeoutMs,
      headers,
      bodyExtras: {
        response_format: jsonSchemaResponseFormat(schemaName, schema),
        provider: { require_parameters: true },
      },
    });
  },
};
