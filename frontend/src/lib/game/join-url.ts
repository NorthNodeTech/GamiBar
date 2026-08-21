import { GAME_CONFIG } from "@shared/game/config";
import { normalizeRoomCode, isValidRoomCodeFormat } from "@shared/game/room-code";

function joinOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Full URL students scan or open to join a room (includes 6-digit code). */
export function getJoinUrl(code: string): string {
  const clean = code.replace(/\D/g, "").slice(0, GAME_CONFIG.room.codeLength);
  const origin = joinOrigin();
  return origin ? `${origin}/join?code=${clean}` : `/join?code=${clean}`;
}

/** Extract a room code from a scanned QR payload (URL or raw digits). */
export function parseJoinCodeFromScan(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(trimmed, base);
    const fromQuery = url.searchParams.get("code");
    if (fromQuery) {
      const clean = normalizeRoomCode(fromQuery);
      if (isValidRoomCodeFormat(clean)) return clean;
    }
  } catch {
    // Not a URL - fall through to raw code parsing.
  }

  const clean = normalizeRoomCode(trimmed);
  return isValidRoomCodeFormat(clean) ? clean : null;
}
