import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Logo } from "@/components/layout/Logo";
import { sound } from "@/lib/sound";

export function SignatureIntroLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("gb_intro_seen");
    if (hasSeen === "true") return;

    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("gb_intro_seen", "true");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="intro-loader"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.04)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => sound.playSnap()}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)]">
            <Logo size={112} />
          </div>

          <h2 className="mt-6 font-display text-2xl font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
            GAMI<span className="text-red-500">BAR</span>
          </h2>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--gamibar-text-tertiary)]">
            Crafting Gamified Mastery
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
