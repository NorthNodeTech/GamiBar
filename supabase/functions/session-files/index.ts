import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.2";

const BUCKET = "gamibar-session-files";
const MAX_FILES_PER_SESSION = 10;
const MAX_BYTES = 50 * 1024 * 1024;
const DOWNLOAD_TTL_SECONDS = 90;
const EXPIRY_HOURS = 24;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-files-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

type RoomRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  author_token_hash: string;
};

type ShareRow = {
  room_id: string;
  share_slug: string;
};

type FileRow = {
  id: string;
  room_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
  downloaded_count: number;
  last_downloaded_at: string | null;
};

type AdminClient = SupabaseClient<any, "public", any>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "";

    if (req.method === "POST" && action === "teacher-list") {
      const body = await readJson(req);
      const roomId = stringBody(body, "roomId");
      const authorToken = stringBody(body, "authorToken");
      const room = await verifyAuthor(admin, roomId, authorToken);
      return json(await teacherSummary(admin, room));
    }

    if (req.method === "POST" && action === "upload") {
      return json(await uploadFiles(admin, req));
    }

    if (req.method === "DELETE" && action === "delete") {
      const body = await readJson(req);
      return json(await deleteFile(admin, body));
    }

    if (req.method === "GET" && action === "list") {
      const shareSlug = requiredParam(url, "shareSlug");
      return json(await publicList(admin, shareSlug));
    }

    if (req.method === "POST" && action === "download") {
      const body = await readJson(req);
      return json(await downloadFile(admin, body));
    }

    if (req.method === "POST" && action === "cleanup") {
      assertCronSecret(req);
      return json(await cleanupExpired(admin));
    }

    return json({ error: "Unsupported session-files action." }, 404);
  } catch (error) {
    const message = error instanceof HttpError ? error.message : "Session file request failed.";
    const status = error instanceof HttpError ? error.status : 500;
    if (!(error instanceof HttpError)) {
      console.error(error);
    }
    return json({ error: message }, status);
  }
});

function createAdminClient(): AdminClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new HttpError("Session file service is not configured.", 500);
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function teacherSummary(admin: AdminClient, room: RoomRow) {
  const share = await ensureShare(admin, room.id);
  const files = await activeFilesForRoom(admin, room.id);
  return {
    room: publicRoom(room),
    shareSlug: share.share_slug,
    files: files.map(publicFile),
  };
}

async function uploadFiles(admin: AdminClient, req: Request) {
  const form = await req.formData();
  const roomId = form.get("roomId");
  const authorToken = form.get("authorToken");
  if (typeof roomId !== "string" || typeof authorToken !== "string") {
    throw new HttpError("Room and author token are required.", 400);
  }

  const room = await verifyAuthor(admin, roomId, authorToken);
  const incoming = form.getAll("files").filter((value): value is File => value instanceof File);
  if (incoming.length === 0) throw new HttpError("Choose at least one file.", 400);

  const current = await activeFilesForRoom(admin, room.id);
  if (current.length + incoming.length > MAX_FILES_PER_SESSION) {
    throw new HttpError(`A session can share up to ${MAX_FILES_PER_SESSION} active files.`, 400);
  }

  const uploadedPaths: string[] = [];
  try {
    for (const file of incoming) {
      const prepared = validateUpload(file);
      const id = crypto.randomUUID();
      const storagePath = `${room.id}/${id}/${prepared.safeName}`;
      const bytes = await file.arrayBuffer();

      const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
        cacheControl: "3600",
        contentType: prepared.mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(storagePath);

      const { error: insertError } = await admin.from("gamibar_session_files").insert({
        id,
        room_id: room.id,
        storage_path: storagePath,
        original_name: prepared.originalName,
        mime_type: prepared.mimeType,
        byte_size: file.size,
        expires_at: new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
      });
      if (insertError) throw insertError;
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await admin.storage.from(BUCKET).remove(uploadedPaths);
    }
    throw error;
  }

  return teacherSummary(admin, room);
}

async function deleteFile(admin: AdminClient, body: Record<string, unknown>) {
  const roomId = stringBody(body, "roomId");
  const authorToken = stringBody(body, "authorToken");
  const fileId = stringBody(body, "fileId");
  const room = await verifyAuthor(admin, roomId, authorToken);

  const { data: file, error } = await admin
    .from("gamibar_session_files")
    .select(
      "id, room_id, storage_path, original_name, mime_type, byte_size, created_at, expires_at, deleted_at, downloaded_count, last_downloaded_at",
    )
    .eq("id", fileId)
    .eq("room_id", room.id)
    .maybeSingle<FileRow>();
  if (error) throw error;
  if (!file || file.deleted_at) throw new HttpError("File is already removed.", 404);

  await admin.storage.from(BUCKET).remove([file.storage_path]);
  const { error: updateError } = await admin
    .from("gamibar_session_files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", file.id);
  if (updateError) throw updateError;

  return teacherSummary(admin, room);
}

async function publicList(admin: AdminClient, shareSlug: string) {
  const { data: share, error: shareError } = await admin
    .from("gamibar_session_file_shares")
    .select("room_id, share_slug")
    .eq("share_slug", shareSlug)
    .maybeSingle<ShareRow>();
  if (shareError) throw shareError;
  if (!share) throw new HttpError("This file share link is not active.", 404);

  const { data: room, error: roomError } = await admin
    .from("gamibar_rooms")
    .select("id, code, name, status, author_token_hash")
    .eq("id", share.room_id)
    .maybeSingle<RoomRow>();
  if (roomError) throw roomError;
  if (!room) throw new HttpError("This file share link is not active.", 404);

  const files = await activeFilesForRoom(admin, room.id);
  return {
    room: publicRoom(room),
    shareSlug: share.share_slug,
    files: files.map(publicFile),
  };
}

async function downloadFile(admin: AdminClient, body: Record<string, unknown>) {
  const shareSlug = stringBody(body, "shareSlug");
  const fileId = stringBody(body, "fileId");
  const share = await shareBySlug(admin, shareSlug);

  const { data: file, error } = await admin
    .from("gamibar_session_files")
    .select(
      "id, room_id, storage_path, original_name, mime_type, byte_size, created_at, expires_at, deleted_at, downloaded_count, last_downloaded_at",
    )
    .eq("id", fileId)
    .eq("room_id", share.room_id)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<FileRow>();
  if (error) throw error;
  if (!file) throw new HttpError("This file has expired or was removed.", 404);

  const { data, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, DOWNLOAD_TTL_SECONDS, { download: file.original_name });
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

async function cleanupExpired(admin: AdminClient) {
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from("gamibar_session_files")
    .select("id, storage_path")
    .is("deleted_at", null)
    .lte("expires_at", now)
    .limit(100);
  if (error) throw error;

  const rows = (expired ?? []) as Pick<FileRow, "id" | "storage_path">[];
  const paths = rows.map((row) => row.storage_path);
  if (paths.length > 0) {
    await admin.storage.from(BUCKET).remove(paths);
    const { error: updateError } = await admin
      .from("gamibar_session_files")
      .update({ deleted_at: now })
      .in(
        "id",
        rows.map((row) => row.id),
      );
    if (updateError) throw updateError;
  }

  return { deleted: rows.length };
}

async function verifyAuthor(admin: AdminClient, roomId: string, authorToken: string) {
  if (!isUuid(roomId) || !authorToken.trim()) {
    throw new HttpError("Invalid room credentials.", 401);
  }
  const { data: room, error } = await admin
    .from("gamibar_rooms")
    .select("id, code, name, status, author_token_hash")
    .eq("id", roomId)
    .maybeSingle<RoomRow>();
  if (error) throw error;
  if (!room) throw new HttpError("Room not found.", 404);
  const tokenHash = await sha256Hex(authorToken);
  if (tokenHash !== room.author_token_hash) {
    throw new HttpError("Invalid author token.", 401);
  }
  return room;
}

async function ensureShare(admin: AdminClient, roomId: string): Promise<ShareRow> {
  const { data: existing, error } = await admin
    .from("gamibar_session_file_shares")
    .select("room_id, share_slug")
    .eq("room_id", roomId)
    .maybeSingle<ShareRow>();
  if (error) throw error;
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error: insertError } = await admin
      .from("gamibar_session_file_shares")
      .insert({ room_id: roomId, share_slug: randomSlug() })
      .select("room_id, share_slug")
      .single<ShareRow>();
    if (!insertError && data) return data;
    if (insertError?.code !== "23505") throw insertError;
  }
  throw new HttpError("Could not create a share link.", 500);
}

async function shareBySlug(admin: AdminClient, shareSlug: string): Promise<ShareRow> {
  if (!/^[A-Za-z0-9_-]{24,80}$/.test(shareSlug)) {
    throw new HttpError("This file share link is not active.", 404);
  }
  const { data, error } = await admin
    .from("gamibar_session_file_shares")
    .select("room_id, share_slug")
    .eq("share_slug", shareSlug)
    .maybeSingle<ShareRow>();
  if (error) throw error;
  if (!data) throw new HttpError("This file share link is not active.", 404);
  return data;
}

async function activeFilesForRoom(admin: AdminClient, roomId: string): Promise<FileRow[]> {
  const { data, error } = await admin
    .from("gamibar_session_files")
    .select(
      "id, room_id, storage_path, original_name, mime_type, byte_size, created_at, expires_at, deleted_at, downloaded_count, last_downloaded_at",
    )
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FileRow[];
}

function validateUpload(file: File) {
  const originalName = sanitizeOriginalName(file.name);
  const extension = originalName.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = MIME_BY_EXTENSION[extension];
  if (!expectedMime) {
    throw new HttpError("Only PDF, PPT, PPTX, DOC, and DOCX files are supported.", 400);
  }
  if (file.size <= 0) throw new HttpError(`${originalName} is empty.`, 400);
  if (file.size > MAX_BYTES) throw new HttpError(`${originalName} is larger than 50 MB.`, 400);
  if (file.type && file.type !== expectedMime) {
    throw new HttpError(`${originalName} does not match its file type.`, 400);
  }
  return {
    originalName,
    safeName: safeStorageName(originalName),
    mimeType: expectedMime,
  };
}

function sanitizeOriginalName(name: string) {
  const trimmed = name
    .replace(/[\\/\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) throw new HttpError("Every file needs a name.", 400);
  if (trimmed.length > 180)
    throw new HttpError(`${trimmed.slice(0, 32)}... has a name that is too long.`, 400);
  return trimmed;
}

function safeStorageName(name: string) {
  const clean = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return clean || "document";
}

function publicFile(file: FileRow) {
  return {
    id: file.id,
    name: file.original_name,
    mimeType: file.mime_type,
    byteSize: file.byte_size,
    createdAt: file.created_at,
    expiresAt: file.expires_at,
    downloadedCount: file.downloaded_count,
  };
}

function publicRoom(room: RoomRow) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    status: room.status,
  };
}

function randomSlug() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(token: string) {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body))
      return body as Record<string, unknown>;
  } catch {
    // Fall through to the standard bad request.
  }
  throw new HttpError("A JSON body is required.", 400);
}

function stringBody(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(`${key} is required.`, 400);
  }
  return value;
}

function requiredParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (!value) throw new HttpError(`${key} is required.`, 400);
  return value;
}

function assertCronSecret(req: Request) {
  const expected = Deno.env.get("SESSION_FILES_CRON_SECRET");
  const provided = req.headers.get("x-session-files-cron-secret");
  if (!expected || provided !== expected) {
    throw new HttpError("Cleanup is not authorized.", 401);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
