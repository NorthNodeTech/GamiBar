/** Reset then set so screen readers re-announce the same phrase when needed. */
export function nextLiveMessage(message: string, onSet: (value: string) => void) {
  onSet("");
  requestAnimationFrame(() => onSet(message));
}

/** Plain-language labels for common game errors (toast + inline). */
export function friendlyGameError(error: string | undefined | null, fallback: string): string {
  if (!error?.trim()) return fallback;
  const lower = error.toLowerCase();
  if (lower.includes("room not found") || lower.includes("code not found")) {
    return "That room code was not found. Check the code and try again.";
  }
  if (lower.includes("closed") || lower.includes("finished")) {
    return "This game has already ended.";
  }
  if (lower.includes("invalid option") || lower.includes("invalid question")) {
    return "That answer could not be submitted. Refresh the page if this keeps happening.";
  }
  if (lower.includes("reconnect") || lower.includes("session")) {
    return "Your session expired. Rejoin with the same name and room code.";
  }
  return error;
}
