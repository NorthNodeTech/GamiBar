import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { useAuth } from "@/lib/auth-store";

const joinSearchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/join")({
  validateSearch: joinSearchSchema,
  component: StudentPortalLayout,
});

/** Student portal is open - no login page. */
function StudentPortalLayout() {
  const { user, enterAsGuest } = useAuth();

  useEffect(() => {
    if (!user || user.role !== "student") {
      enterAsGuest("student");
    }
  }, [user, enterAsGuest]);

  return <Outlet />;
}
