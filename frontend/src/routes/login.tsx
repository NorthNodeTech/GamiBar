import { createFileRoute, redirect } from "@tanstack/react-router";

import { getStoredAuth, isAuthorAuthenticated } from "@/lib/auth-store";

/** Legacy route - author auth lives at /author/login */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const auth = getStoredAuth();
    if (isAuthorAuthenticated(auth)) {
      throw redirect({ to: "/author" });
    }
    throw redirect({ to: "/author/login" });
  },
  component: () => null,
});
