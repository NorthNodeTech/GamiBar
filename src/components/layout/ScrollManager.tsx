import { useRouterState } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

/**
 * Keep the marketing homepage anchored at the hero on full reload.
 * Browser scroll restoration otherwise reopens mid-page (e.g. footer).
 */
export function ScrollManager() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  useLayoutEffect(() => {
    if (pathname !== "/" || hash) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, [pathname, hash]);

  return null;
}
