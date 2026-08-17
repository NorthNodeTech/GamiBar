import { GoogleGenAI } from "@google/genai";

import { HttpError } from "../http-error.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

let geminiClient;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError("Gemini API key is not configured.", 503);
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}
