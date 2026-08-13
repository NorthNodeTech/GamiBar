import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Logo } from "@/components/layout/Logo";
import { sound } from "@/lib/sound";

function shouldShowIntro(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("gb_intro_seen") !== "true";
}

const subscribeToIntroState = () => () => {};

export function SignatureIntroLoader() {
  const shouldShow = useSyncExternalStore(subscribeToIntroState, shouldShowIntro, () => false);
  const [dismissed, setDismissed] = useState(false);
  const visible = shouldShow && !dismissed;

  useLayoutEffect(() => {
    if (!visible) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem("gb_intro_seen", "true");
    }, 3200);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="intro-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.04)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => sound.playSnap()}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <Logo size={96} />

            <h2 className="mt-5 font-display text-2xl font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
              GAMI<span className="text-red-500">BAR</span>
            </h2>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--gamibar-text-tertiary)]">
              Crafting Gamified Mastery
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
