import { GoogleGenAI } from "@google/genai";

import { HttpError } from "../http-error.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

let keyPool = [];
let clientPool = [];
let roundRobinIndex = 0;

function parseGeminiKeys() {
  const keys = [];
  const raw1 = process.env.GEMINI_API_KEY?.trim() || "";
  const raw2 = process.env.GEMINI_API_KEY_2?.trim() || "";
  const raw3 = process.env.GEMINI_API_KEY_3?.trim() || "";

  for (const raw of [raw1, raw2, raw3]) {
    if (raw) {
      for (const k of raw.split(",")) {
        const clean = k.trim();
        if (clean && !keys.includes(clean)) {
          keys.push(clean);
        }
      }
    }
  }
  return keys;
}

function initClientPool() {
  const currentKeys = parseGeminiKeys();
  if (
    clientPool.length === 0 ||
    keyPool.length !== currentKeys.length ||
    keyPool.some((k, i) => k !== currentKeys[i])
  ) {
    keyPool = currentKeys;
    clientPool = currentKeys.map((apiKey) => new GoogleGenAI({ apiKey }));
  }
  return clientPool;
}

export function hasGeminiKey() {
  return parseGeminiKeys().length > 0;
}

export function getGeminiKeyCount() {
  return parseGeminiKeys().length;
}

/**
 * Returns the next Gemini client using round-robin distribution across available keys.
 */
export function getNextGeminiClient() {
  const pool = initClientPool();
  if (pool.length === 0) {
    throw new HttpError("Gemini API key is not configured.", 503);
  }
  const client = pool[roundRobinIndex % pool.length];
  roundRobinIndex = (roundRobinIndex + 1) % pool.length;
  return client;
}

/**
 * Returns all initialized Gemini clients in the pool ordered starting from preferred index (odd/even balancing).
 */
export function getGeminiClientsOrdered(preferredIndex = 0) {
  const pool = initClientPool();
  if (pool.length === 0) {
    throw new HttpError("Gemini API key is not configured.", 503);
  }
  if (pool.length === 1) return pool;

  const startIndex = Math.abs(preferredIndex) % pool.length;
  const ordered = [];
  for (let i = 0; i < pool.length; i++) {
    ordered.push(pool[(startIndex + i) % pool.length]);
  }
  return ordered;
}

export function getAllGeminiClients() {
  return initClientPool();
}

export function getGeminiClient() {
  return getNextGeminiClient();
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}
