import { useEffect, useLayoutEffect, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

export function SignatureIntroLoader() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    setMounted(true);
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

  if (!visible) return null;

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-white text-[#111111] transition-opacity duration-300 pointer-events-none",
        mounted ? "opacity-100" : "opacity-100",
      )}
    >
      <div className="flex flex-col items-center text-center px-4">
        {/* Center Logo Card */}
        <div className="grid size-24 place-items-center rounded-3xl bg-[#111111] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
          <Logo size={64} />
        </div>

        <h2 className="mt-5 font-display text-2xl font-black tracking-tight text-[#111111]">
          Gami<span className="font-extrabold text-[#111111]">BAR</span>
        </h2>

        {/* Minimalist neutral progress bar */}
        <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className={cn(
              "h-full bg-[#111111] rounded-full transition-all duration-500 ease-out",
              mounted ? "w-full" : "w-0",
            )}
          />
        </div>
      </div>
    </div>
  );
}
