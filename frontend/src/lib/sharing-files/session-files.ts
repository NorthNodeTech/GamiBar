import { apiFetch } from "@/lib/api-client";
import { supabaseGame as supabase } from "@/lib/supabase/client";

const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "");

export const SESSION_FILE_MAX_FILES = 1;
export const SESSION_FILE_MAX_BYTES = 50 * 1024 * 1024;
export const SESSION_FILE_DEFAULT_RETENTION_DAYS = 7;
export const SESSION_FILE_RETENTION_OPTIONS = [7, 14, 28] as const;
const RESOURCE_DROP_RECONCILIATION_MS = 60_000;
export const SESSION_FILE_ACCEPT =
  ".pdf,.ppt,.pptx,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type SessionFileRetentionDays = (typeof SESSION_FILE_RETENTION_OPTIONS)[number];

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export type SessionSharedFile = {
  id: string;
  name: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  expiresAt: string;
  downloadedCount?: number;
};

export type SessionFileRoom = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type SessionFileSummary = {
  room: SessionFileRoom;
  shareSlug: string;
  files: SessionSharedFile[];
};

export type SessionFileValidation = {
  ok: boolean;
  errors: string[];
};

export function validateSessionShareFiles(
  files: File[],
  activeCount = 0,
  maxBytes = SESSION_FILE_MAX_BYTES,
): SessionFileValidation {
  const errors: string[] = [];
  if (files.length + activeCount > SESSION_FILE_MAX_FILES) {
    errors.push(`A session can share up to ${SESSION_FILE_MAX_FILES} active files.`);
  }
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const expectedMime = MIME_BY_EXTENSION[extension];
    if (!expectedMime) {
      errors.push(`${file.name} is not a PDF, PPT, PPTX, DOC, or DOCX file.`);
      continue;
    }
    if (file.size <= 0) {
      errors.push(`${file.name} is empty.`);
    }
    if (file.size > maxBytes) {
      errors.push(`${file.name} is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }
    if (file.type && file.type !== expectedMime) {
      errors.push(`${file.name} does not match its file type.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export async function fetchTeacherSessionFiles(
  roomId: string,
  authorToken: string,
): Promise<SessionFileSummary> {
  return sessionFileFetch("teacher-list", {
    method: "POST",
    json: { roomId, authorToken },
  });
}

export async function uploadSessionFiles(
  roomId: string,
  authorToken: string,
  files: File[],
  expiryDays: SessionFileRetentionDays = SESSION_FILE_DEFAULT_RETENTION_DAYS,
): Promise<SessionFileSummary> {
  const validation = validateSessionShareFiles(files);
  if (!validation.ok) throw new Error(validation.errors[0] ?? "Some files cannot be uploaded.");
  if (!isSessionFileRetentionDays(expiryDays)) {
    throw new Error("Choose how long GamiBar should keep these documents.");
  }
  const form = new FormData();
  form.append("roomId", roomId);
  form.append("authorToken", authorToken);
  form.append("expiryDays", String(expiryDays));
  for (const file of files) {
    form.append("files", file);
  }
  return sessionFileFetch("upload", { method: "POST", body: form });
}

export async function deleteSessionFile(
  roomId: string,
  authorToken: string,
  fileId: string,
): Promise<SessionFileSummary> {
  return sessionFileFetch("delete", {
    method: "DELETE",
    json: { roomId, authorToken, fileId },
  });
}

export async function fetchSharedSessionFiles(shareSlug: string): Promise<SessionFileSummary> {
  return sessionFileFetch("list", {
    method: "GET",
    searchParams: { shareSlug },
  });
}

export async function createSharedFileDownloadUrl(
  shareSlug: string,
  fileId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  return sessionFileFetch("download", {
    method: "POST",
    json: { shareSlug, fileId },
  });
}

export function getSessionFileShareUrl(shareSlug: string): string {
  let origin = "";
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      !PUBLIC_APP_URL
    ) {
      origin = window.location.origin;
    } else {
      origin = PUBLIC_APP_URL;
    }
  } else {
    origin = PUBLIC_APP_URL || "";
  }
  return origin ? `${origin}/share/${shareSlug}` : `/share/${shareSlug}`;
}

export function formatSessionFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export function getFileKindLabel(mimeType: string): string {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "PPT";
  if (mimeType.includes("word")) return "DOC";
  return "File";
}

export function formatExpiryLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Expired";
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0
      ? `${days} day${days === 1 ? "" : "s"} ${remainingHours} hr left`
      : `${days} day${days === 1 ? "" : "s"} left`;
  }
  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min left` : `${hours} hr left`;
}

export function isSessionFileRetentionDays(value: number): value is SessionFileRetentionDays {
  return SESSION_FILE_RETENTION_OPTIONS.includes(value as SessionFileRetentionDays);
}

export function subscribeResourceDropChanges(
  target: { roomId?: string; shareSlug?: string },
  onChange: () => void | Promise<void>,
  onStatus?: (status: "connecting" | "connected" | "disconnected") => void,
): () => void {
  const topic = target.shareSlug
    ? `resource-drop:${target.shareSlug}`
    : target.roomId
      ? `resource-drop-room:${target.roomId}`
      : "";
  if (!topic) {
    onStatus?.("disconnected");
    return () => {};
  }

  let channel: ReturnType<typeof supabase.channel> | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let reconciliation: Promise<void> | null = null;
  let reconciliationQueued = false;
  let reconnecting = false;
  let disposed = false;

  const clearPollTimer = () => {
    if (pollTimer !== undefined) clearTimeout(pollTimer);
    pollTimer = undefined;
  };

  const reconcile = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (reconciliation) {
      reconciliationQueued = true;
      return reconciliation;
    }

    reconciliation = (async () => {
      do {
        reconciliationQueued = false;
        if (disposed) return;
        try {
          await onChange();
        } catch {
          // Broadcast and polling are best-effort invalidation paths. Consumers
          // retain their last durable Express snapshot when a refresh fails.
        }
      } while (reconciliationQueued && !disposed);
    })().finally(() => {
      reconciliation = null;
    });
    return reconciliation;
  };

  const schedulePoll = () => {
    clearPollTimer();
    if (disposed || typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }
    pollTimer = setTimeout(() => {
      pollTimer = undefined;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        schedulePoll();
        return;
      }
      void reconcile().finally(schedulePoll);
    }, RESOURCE_DROP_RECONCILIATION_MS);
  };

  const reconcileNow = () => {
    if (disposed || typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }
    clearPollTimer();
    void reconcile().finally(schedulePoll);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") reconcileNow();
    else clearPollTimer();
  };
  const onOnline = () => reconcileNow();

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    schedulePoll();
  }

  onStatus?.("connecting");
  void supabase.realtime
    .setAuth()
    .then(() => {
      if (disposed) return;
      channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "changed" }, reconcileNow);
      channel.subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          onStatus?.("connected");
          if (reconnecting) {
            reconnecting = false;
            reconcileNow();
          }
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          reconnecting = true;
          onStatus?.("disconnected");
          return;
        }
        onStatus?.("connecting");
      });
    })
    .catch(() => {
      if (!disposed) onStatus?.("disconnected");
    });

  return () => {
    disposed = true;
    clearPollTimer();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    }
    if (channel) void supabase.removeChannel(channel);
  };
}

type FetchOptions = {
  method: "GET" | "POST" | "DELETE";
  searchParams?: Record<string, string>;
  json?: Record<string, unknown>;
  body?: BodyInit;
};

async function sessionFileFetch<T>(action: string, options: FetchOptions): Promise<T> {
  let body = options.body;
  let json = options.json;
  if (options.json) {
    body = undefined;
  }
  if (body) {
    json = undefined;
  }

  return apiFetch<T>(`/api/session-files/${action}`, {
    method: options.method,
    searchParams: options.searchParams,
    json,
    body,
    auth: true,
    timeoutMs: body instanceof FormData ? 180_000 : undefined,
  });
}
