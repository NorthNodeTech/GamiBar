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

/**
 * Resolve an optional signed-in user without making public gameplay depend on
 * authentication. Missing, expired, or invalid bearer tokens are treated as a
 * guest session.
 */
export async function optionalUser(req) {
  const token = bearerToken(req);
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function requireAuthor(req, expectedUserId) {
  const user = await requireUser(req, expectedUserId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gamibar_authors")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data?.role !== "author") {
    throw new HttpError("An author account is required.", 403);
  }

  return user;
}

export function registerAuthRoutes(app) {
  app.get("/api/auth/profile", async (req, res, next) => {
    try {
      const user = await requireUser(req);
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("gamibar_authors")
        .select("id, display_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      res.json({ profile: data });
    } catch (error) {
      next(error);
    }
  });
}

function bearerToken(req) {
  const value = req.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1]?.trim() ?? "";
}
