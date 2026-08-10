import { createStart } from "@tanstack/react-start";

// Static SPA: no server-function CSRF middleware (rooms run in the browser via Supabase).
export const startInstance = createStart(() => ({
  requestMiddleware: [],
}));
