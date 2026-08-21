import { GAME_CONFIG } from "@shared/game/config";

/** 6-digit numeric codes - easy to type, not DB IDs. */
export function generateRoomCode(existing: Set<string> = new Set()): string {
  const len = GAME_CONFIG.room.codeLength;
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = "";
    for (let i = 0; i < len; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    if (code[0] === "0") continue; // avoid leading zero confusion
    if (!existing.has(code)) return code;
  }
  // Extremely unlikely fallback
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function normalizeRoomCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, GAME_CONFIG.room.codeLength);
}

export function isValidRoomCodeFormat(code: string): boolean {
  return new RegExp(`^\\d{${GAME_CONFIG.room.codeLength}}$`).test(code);
}
