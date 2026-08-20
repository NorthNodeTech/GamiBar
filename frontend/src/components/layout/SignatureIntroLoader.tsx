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
    }, 550);

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
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-white text-[#111111]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center px-4"
          >
            {/* Center Logo Card */}
            <div className="grid size-24 place-items-center rounded-3xl bg-[#111111] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
              <Logo size={64} />
            </div>

            <h2 className="mt-5 font-display text-2xl font-black tracking-tight text-[#111111]">
              Gami<span className="font-extrabold text-[#111111]">BAR</span>
            </h2>

            {/* Minimalist neutral progress bar */}
            <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-[#E5E7EB]">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full bg-[#111111] rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
