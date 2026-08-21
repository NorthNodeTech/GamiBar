import crypto from "node:crypto";

import multer from "multer";

import { getAuthorPlanLimits } from "./billing/service.js";
import { HttpError } from "./http-error.js";
import { createAdminClient } from "./supabase-admin.js";
import { sendRealtimeSignal } from "./realtime.js";

const BUCKET = "gamibar-session-files";
const MAX_FILES_PER_SESSION = 1;
const MAX_BYTES = 50 * 1024 * 1024;
const DOWNLOAD_TTL_SECONDS = 90;
const RETENTION_DAY_OPTIONS = new Set([7, 14, 28]);
const DEFAULT_RETENTION_DAYS = 7;

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export const sessionFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES_PER_SESSION,
    fileSize: MAX_BYTES,
  },
});

export function registerSessionFileRoutes(app) {
  app.post(
    "/api/session-files/teacher-list",
    asyncRoute(async (req, res) => {
      const admin = createAdminClient();
      const room = await verifyAuthor(
        admin,
        stringBody(req.body, "roomId"),
        optionalStringBody(req.body, "authorToken"),
        req,
      );
      const summary = await teacherSummary(admin, room);
      res.json(summary);
    }),
  );

  app.post(
    "/api/session-files/upload",
    sessionFileUpload.array("files", MAX_FILES_PER_SESSION),
    asyncRoute(async (req, res) => {
      const admin = createAdminClient();
      const roomId = stringBody(req.body, "roomId");
      const authorToken = optionalStringBody(req.body, "authorToken");
      const room = await verifyAuthor(admin, roomId, authorToken, req);
      const planLimits = room.author_id
        ? await getAuthorPlanLimits(room.author_id)
        : { filesPerRoom: 1, fileSizeMb: 15, fileRetentionDays: 7 };
      const retentionDays = parseRetentionDays(
        req.body.expiryDays,
        planLimits.fileRetentionDays,
      );
      const maxBytes = planLimits.fileSizeMb * 1024 * 1024;
      const files = Array.isArray(req.files) ? req.files : [];
      if (files.length === 0)
        throw new HttpError("Choose at least one document.", 400);

      const current = await activeFilesForRoom(admin, room.id);
      if (current.length + files.length > planLimits.filesPerRoom) {
        throw new HttpError(
          `A resource drop can hold up to ${planLimits.filesPerRoom} active document.`,
          400,
        );
      }

      const uploadedPaths = [];
      try {
        for (const file of files) {
          const prepared = validateUpload(
            file,
            maxBytes,
            planLimits.fileSizeMb,
          );
          const id = crypto.randomUUID();
          const storagePath = `${room.id}/${id}/${prepared.safeName}`;

          const { error: uploadError } = await admin.storage
            .from(BUCKET)
            .upload(storagePath, file.buffer, {
              cacheControl: "3600",
              contentType: prepared.mimeType,
              upsert: false,
            });
          if (uploadError) throw uploadError;
          uploadedPaths.push(storagePath);

          const { error: insertError } = await admin
            .from("gamibar_session_files")
            .insert({
              id,
              room_id: room.id,
              storage_path: storagePath,
              original_name: prepared.originalName,
              mime_type: prepared.mimeType,
              byte_size: file.size,
              expires_at: daysFromNow(retentionDays).toISOString(),
            });
          if (insertError) throw insertError;
        }
      } catch (error) {
        if (uploadedPaths.length > 0) {
          try {
            await removeStoredFiles(admin, uploadedPaths);
          } catch (cleanupError) {
            console.error("Could not roll back uploaded Resource Drop files", {
              count: uploadedPaths.length,
              message:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            });
          }
        }
        throw error;
      }

      const summary = await teacherSummary(admin, room);
      await notifyResourceDropChanged({
        roomId: room.id,
        shareSlug: summary.shareSlug,
      });
      res.json(summary);
    }),
  );

  app.delete(
    "/api/session-files/delete",
    asyncRoute(async (req, res) => {
      const admin = createAdminClient();
      const roomId = stringBody(req.body, "roomId");
      const authorToken = optionalStringBody(req.body, "authorToken");
      const fileId = stringBody(req.body, "fileId");
      const room = await verifyAuthor(admin, roomId, authorToken, req);

      const { data: file, error } = await admin
        .from("gamibar_session_files")
        .select(fileSelect())
        .eq("id", fileId)
        .eq("room_id", room.id)
        .maybeSingle();
      if (error) throw error;
      if (!file || file.deleted_at)
        throw new HttpError("That document is already removed.", 404);

      await removeStoredFiles(admin, [file.storage_path]);
      const { error: updateError } = await admin
        .from("gamibar_session_files")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", file.id);
      if (updateError) throw updateError;

      const summary = await teacherSummary(admin, room);
      await notifyResourceDropChanged({
        roomId: room.id,
        shareSlug: summary.shareSlug,
      });
      res.json(summary);
    }),
  );

  app.get(
    "/api/session-files/list",
    asyncRoute(async (req, res) => {
      const admin = createAdminClient();
      const shareSlug = stringQuery(req.query, "shareSlug");
      res.json(await publicList(admin, shareSlug));
    }),
  );

  app.post(
    "/api/session-files/download",
    asyncRoute(async (req, res) => {
      const admin = createAdminClient();
      res.json(await downloadFile(admin, req.body));
    }),
  );

  app.post(
    "/api/session-files/cleanup",
    asyncRoute(async (req, res) => {
      assertCronSecret(req);
      const admin = createAdminClient();
      res.json(await cleanupExpired(admin));
    }),
  );
}

export function scheduleSessionFileCleanup() {
  const intervalMs = Number.parseInt(
    process.env.SESSION_FILES_CLEANUP_INTERVAL_MS ?? "",
    10,
  );
  const cleanupEveryMs =
    Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 60 * 60 * 1000;

  void runSessionFileCleanup();
  const timer = setInterval(() => {
    void runSessionFileCleanup();
  }, cleanupEveryMs);
  timer.unref?.();
}

async function runSessionFileCleanup() {
  try {
    const admin = createAdminClient();
    await cleanupExpired(admin);
  } catch (error) {
    console.warn(
      error instanceof Error
        ? `Resource Drop cleanup skipped: ${error.message}`
        : error,
    );
  }
}

async function teacherSummary(admin, room) {
  const share = await ensureShare(admin, room.id);
  const files = await activeFilesForRoom(admin, room.id);
  return {
    room: publicRoom(room),
    shareSlug: share.share_slug,
    files: files.map(publicFile),
  };
}

async function publicList(admin, shareSlug, code) {
  const queryParam = (shareSlug || code || "").trim();
  let share = null;

  if (/^[1-9][0-9]{5}$/.test(queryParam)) {
    const { data: room, error: roomErr } = await admin
      .from("gamibar_rooms")
      .select("id, code, name, status, author_id, author_token_hash")
      .eq("code", queryParam)
      .maybeSingle();
    if (roomErr) throw roomErr;
    if (!room) throw new HttpError("This resource drop is not active.", 404);
    share = await ensureShare(admin, room.id);
    const files = await activeFilesForRoom(admin, room.id);
    return {
      room: publicRoom(room),
      shareSlug: share.share_slug,
      files: files.map(publicFile),
    };
  }

  share = await shareBySlug(admin, queryParam);
  const { data: room, error: roomError } = await admin
    .from("gamibar_rooms")
    .select("id, code, name, status, author_id, author_token_hash")
    .eq("id", share.room_id)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!room) throw new HttpError("This resource drop is not active.", 404);

  const files = await activeFilesForRoom(admin, room.id);
  return {
    room: publicRoom(room),
    shareSlug: share.share_slug,
    files: files.map(publicFile),
  };
}

async function downloadFile(admin, body) {
  const shareSlug = stringBody(body, "shareSlug");
  const fileId = stringBody(body, "fileId");
  let share = null;

  if (/^[1-9][0-9]{5}$/.test(shareSlug)) {
    const { data: room, error: roomErr } = await admin
      .from("gamibar_rooms")
      .select("id")
      .eq("code", shareSlug)
      .maybeSingle();
    if (roomErr) throw roomErr;
    if (!room) throw new HttpError("This resource drop is not active.", 404);
    share = await ensureShare(admin, room.id);
  } else {
    share = await shareBySlug(admin, shareSlug);
  }

  const { data: file, error } = await admin
    .from("gamibar_session_files")
    .select(fileSelect())
    .eq("id", fileId)
    .eq("room_id", share.room_id)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!file)
    throw new HttpError("This document has expired or was removed.", 404);

  const { data, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, DOWNLOAD_TTL_SECONDS, {
      download: file.original_name,
    });
  if (signError) throw signError;

  await admin
    .from("gamibar_session_files")
    .update({
      downloaded_count: file.downloaded_count + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq("id", file.id);

  return {
    url: data.signedUrl,
    expiresInSeconds: DOWNLOAD_TTL_SECONDS,
  };
}

async function cleanupExpired(admin) {
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from("gamibar_session_files")
    .select("id, room_id, storage_path")
    .is("deleted_at", null)
    .lte("expires_at", now)
    .limit(100);
  if (error) throw error;

  const rows = expired ?? [];
  const paths = rows.map((row) => row.storage_path);
  if (paths.length > 0) {
    await removeStoredFiles(admin, paths);
    const { error: updateError } = await admin
      .from("gamibar_session_files")
      .update({ deleted_at: now })
      .in(
        "id",
        rows.map((row) => row.id),
      );
    if (updateError) throw updateError;

    const roomIds = [...new Set(rows.map((row) => row.room_id))];
    const { data: shares } = await admin
      .from("gamibar_session_file_shares")
      .select("room_id, share_slug")
      .in("room_id", roomIds);
    await Promise.all(
      roomIds.map((roomId) =>
        notifyResourceDropChanged({
          roomId,
          shareSlug: shares?.find((share) => share.room_id === roomId)
            ?.share_slug,
        }),
      ),
    );
  }

  return { deleted: rows.length };
}

async function removeStoredFiles(admin, paths) {
  const { error } = await admin.storage.from(BUCKET).remove(paths);
  if (error) {
    throw new Error(`Supabase Storage removal failed: ${error.message}`);
  }
}

async function notifyResourceDropChanged({ roomId, shareSlug }) {
  await Promise.all([
    sendRealtimeSignal(`resource-drop-room:${roomId}`, "changed", {
      roomId,
      shareSlug,
    }),
    shareSlug
      ? sendRealtimeSignal(`resource-drop:${shareSlug}`, "changed", {
          roomId,
          shareSlug,
        })
      : Promise.resolve(),
  ]);
}

async function verifyAuthor(admin, roomId, authorToken, req) {
  if (!isUuid(roomId)) {
    throw new HttpError("Invalid room credentials.", 401);
  }
  const { data: room, error } = await admin
    .from("gamibar_rooms")
    .select("id, code, name, status, author_id, author_token_hash")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  if (!room) throw new HttpError("Room not found.", 404);

  // 1. Check author token hash if provided
  if (typeof authorToken === "string" && authorToken.trim()) {
    if (sha256Hex(authorToken.trim()) === room.author_token_hash) {
      return room;
    }
  }

  // 2. Check authenticated user if request has Authorization header
  if (req && room.author_id) {
    const authHeader = req.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    const token = match?.[1]?.trim();
    if (token) {
      const { data: authData } = await admin.auth.getUser(token);
      if (authData?.user?.id && authData.user.id === room.author_id) {
        return room;
      }
    }
  }

  throw new HttpError("Invalid author token.", 401);
}

async function ensureShare(admin, roomId) {
  const { data: existing, error } = await admin
    .from("gamibar_session_file_shares")
    .select("room_id, share_slug")
    .eq("room_id", roomId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error: insertError } = await admin
      .from("gamibar_session_file_shares")
      .insert({ room_id: roomId, share_slug: randomSlug() })
      .select("room_id, share_slug")
      .single();
    if (!insertError && data) return data;
    if (insertError?.code !== "23505") throw insertError;
  }
  throw new HttpError("Could not create a resource drop link.", 500);
}

async function shareBySlug(admin, shareSlug) {
  if (!/^[A-Za-z0-9_-]{24,80}$/.test(shareSlug)) {
    throw new HttpError("This resource drop is not active.", 404);
  }
  const { data, error } = await admin
    .from("gamibar_session_file_shares")
    .select("room_id, share_slug")
    .eq("share_slug", shareSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("This resource drop is not active.", 404);
  return data;
}

async function activeFilesForRoom(admin, roomId) {
  const { data, error } = await admin
    .from("gamibar_session_files")
    .select(fileSelect())
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function validateUpload(file, maxBytes = MAX_BYTES, maxSizeMb = 50) {
  const originalName = sanitizeOriginalName(file.originalname);
  const extension = originalName.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = MIME_BY_EXTENSION[extension];
  if (!expectedMime) {
    throw new HttpError(
      "Only PDF, PPT, PPTX, DOC, and DOCX documents are supported.",
      400,
    );
  }
  if (file.size <= 0) throw new HttpError(`${originalName} is empty.`, 400);
  if (file.size > maxBytes)
    throw new HttpError(`${originalName} is larger than ${maxSizeMb} MB.`, 400);
  if (
    file.mimetype &&
    file.mimetype !== "application/octet-stream" &&
    file.mimetype !== expectedMime
  ) {
    throw new HttpError(`${originalName} does not match its file type.`, 400);
  }
  return {
    originalName,
    safeName: safeStorageName(originalName),
    mimeType: expectedMime,
  };
}

function sanitizeOriginalName(name) {
  const trimmed = String(name ?? "")
    .replace(/[\\/\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) throw new HttpError("Every document needs a name.", 400);
  if (trimmed.length > 180) {
    throw new HttpError(
      `${trimmed.slice(0, 32)}... has a name that is too long.`,
      400,
    );
  }
  return trimmed;
}

function safeStorageName(name) {
  const clean = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return clean || "document";
}

function parseRetentionDays(value, maxRetentionDays = 28) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_RETENTION_DAYS), 10);
  if (!RETENTION_DAY_OPTIONS.has(parsed)) {
    throw new HttpError("Choose a retention window of 7, 14, or 28 days.", 400);
  }
  if (parsed > maxRetentionDays) {
    throw new HttpError(
      `Your current plan keeps shared files for up to ${maxRetentionDays} days.`,
      403,
    );
  }
  return parsed;
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function publicFile(file) {
  return {
    id: file.id,
    name: file.original_name,
    mimeType: file.mime_type,
    byteSize: Number(file.byte_size),
    createdAt: file.created_at,
    expiresAt: file.expires_at,
    downloadedCount: file.downloaded_count,
  };
}

function publicRoom(room) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    status: room.status,
  };
}

function randomSlug() {
  return crypto.randomBytes(24).toString("base64url");
}

function sha256Hex(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function fileSelect() {
  return [
    "id",
    "room_id",
    "storage_path",
    "original_name",
    "mime_type",
    "byte_size",
    "created_at",
    "expires_at",
    "deleted_at",
    "downloaded_count",
    "last_downloaded_at",
  ].join(", ");
}

function stringBody(body, key) {
  const value = body?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(`${key} is required.`, 400);
  }
  return value;
}

function optionalStringBody(body, key) {
  const value = body?.[key];
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

function stringQuery(query, key) {
  const value = query?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(`${key} is required.`, 400);
  }
  return value;
}

function assertCronSecret(req) {
  const expected = process.env.SESSION_FILES_CRON_SECRET;
  const provided = req.get("x-session-files-cron-secret");
  if (!expected || provided !== expected) {
    throw new HttpError("Cleanup is not authorized.", 401);
  }
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
