import { createFileRoute, redirect } from "@tanstack/react-router";

/** Auth UI retired - Join Game opens the student portal directly. */
export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    throw redirect({ to: "/join" });
  },
  component: () => null,
});
