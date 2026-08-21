import { useRouterState } from "@/lib/navigation";
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
  }, [pathname, hash]);

  useLayoutEffect(() => {
    if (pathname !== "/" || !hash) return;

    const id = decodeURIComponent(hash.replace(/^#/, ""));
    const target = document.getElementById(id);
    if (!target) return;

    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }, [pathname, hash]);

  return null;
}
