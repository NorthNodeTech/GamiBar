import { HttpError } from "../../http-error.js";
import { getAllGeminiClients, getGeminiModel, hasGeminiKey } from "../gemini-client.js";

export const geminiProvider = {
  id: "gemini",
  label: "Gemini",
  isConfigured() {
    return hasGeminiKey();
  },
  async generateJson({ prompt, schema, timeoutMs = 25000 }) {
    const clients = getAllGeminiClients();
    let lastError = null;

    // Try available Gemini clients in the pool (e.g. Key 1, Key 2)
    for (let attempt = 0; attempt < clients.length; attempt += 1) {
      const client = clients[attempt];
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs),
        );

        const requestPromise = client.models.generateContent({
          model: getGeminiModel(),
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            ...(schema ? { responseSchema: schema } : {}),
          },
        });

        const response = await Promise.race([requestPromise, timeoutPromise]);
        const text = response?.text?.trim();
        if (text) {
          return text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Gemini client [key #${attempt + 1}] failed`, {
          name: err instanceof Error ? err.name : "UnknownError",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        // If there are more clients in the pool, loop immediately to the next key!
      }
    }

    throw new HttpError(
      lastError?.message || "Gemini could not generate content right now.",
      502,
    );
  },
};
