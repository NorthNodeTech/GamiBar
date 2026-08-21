import { HttpError } from "../../http-error.js";
import { getGeminiClient, getGeminiModel } from "../gemini-client.js";

export const geminiProvider = {
  id: "gemini",
  label: "Gemini",
  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  },
  async generateJson({ prompt, schema, timeoutMs }) {
    try {
      const interaction = await getGeminiClient().interactions.create(
        {
          model: getGeminiModel(),
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema,
          },
        },
        { timeout: timeoutMs, maxRetries: 0 },
      );
      return interaction?.output_text ?? interaction?.outputText ?? "";
    } catch (err) {
      console.warn("Gemini generation failed", {
        name: err instanceof Error ? err.name : "UnknownError",
        message: err instanceof Error ? err.message : "Unknown provider error",
      });
      throw new HttpError("Gemini could not generate options right now.", 502);
    }
  },
};
