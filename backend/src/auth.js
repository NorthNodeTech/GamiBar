import { HttpError } from "./http-error.js";
import { createAdminClient } from "./supabase-admin.js";

export async function requireUser(req, expectedUserId) {
  const token = bearerToken(req);
  if (!token) throw new HttpError("Sign in to continue.", 401);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError("Your session expired. Sign in again.", 401);
  }

  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new HttpError("You do not have access to this resource.", 403);
  }

  return data.user;
}

function bearerToken(req) {
  const value = req.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1]?.trim() ?? "";
}
