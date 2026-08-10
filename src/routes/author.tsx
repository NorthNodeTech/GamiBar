import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { getStoredAuth, isAuthorAuthenticated, sanitizeAuthorRedirect } from "@/lib/auth-store";

const PUBLIC_AUTHOR_PATHS = new Set(["/author/login", "/author/register"]);

export const Route = createFileRoute("/author")({
  beforeLoad: ({ location }) => {
    const pathname = location.pathname.replace(/\/+$/, "") || "/author";
    if (PUBLIC_AUTHOR_PATHS.has(pathname)) return;

    const auth = getStoredAuth();
    if (!isAuthorAuthenticated(auth)) {
      throw redirect({
        to: "/author/login",
        search: { redirect: sanitizeAuthorRedirect(pathname, "/author") },
      });
    }
  },
  component: () => <Outlet />,
});
