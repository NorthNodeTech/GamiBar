import { HttpError } from "../../http-error.js";

const DEFAULT_TIMEOUT_MS = 30000;

export async function callOpenAiCompatibleProvider({
  baseUrl,
  apiKey,
  model,
  prompt,
  schema,
  schemaName,
  headers = {},
  bodyExtras = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 900,
        stream: false,
        ...bodyExtras,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = extractProviderError(payload) || `AI provider returned ${response.status}.`;
      throw new HttpError(message, 502);
    }

    const content = extractChatContent(payload);
    if (!content) {
      throw new HttpError("AI provider returned an empty response.", 502);
    }

    return content;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new HttpError("AI provider timed out.", 502);
    }
    if (err instanceof HttpError) throw err;
    throw new HttpError("AI provider request failed.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export function jsonSchemaResponseFormat(schemaName, schema) {
  return {
    type: "json_schema",
    json_schema: {
      name: schemaName,
      strict: true,
      schema,
    },
  };
}

function extractChatContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function extractProviderError(payload) {
  const error = payload?.error;
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (typeof payload?.message === "string") return payload.message;
  return "";
}
