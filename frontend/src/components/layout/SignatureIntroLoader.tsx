import { useEffect, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/Logo";

export function SignatureIntroLoader() {
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const timer = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      setVisible(false);
    }, 600);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="intro-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#070707] text-white"
        >
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,59,48,0.12)_0%,transparent_65%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center text-center px-4"
          >
            <div className="relative">
              <Logo size={72} />
              <div className="absolute -inset-2 -z-10 rounded-full bg-[#FF3B30]/20 blur-xl animate-pulse" />
            </div>

            <h2 className="mt-4 font-display text-xl font-black uppercase tracking-[0.16em] text-white">
              GAMI<span className="text-[#FF3B30]">BAR</span>
            </h2>

            {/* Quick smooth progress bar */}
            <div className="mt-4 h-1 w-36 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.55, ease: "easeInOut" }}
                className="h-full bg-[#FF3B30] rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
