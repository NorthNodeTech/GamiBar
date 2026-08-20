import { memo, useEffect, useRef, type CSSProperties } from "react";

/* ─────────────────────────────────────────────────────────────────
   Clean AmbientBackground Component (No floating puzzle shapes)
───────────────────────────────────────────────────────────────── */
export function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRafRef = useRef(0);

  /* Mouse via CSS vars - smooth ambient lighting */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (mouseRafRef.current) return;
      mouseRafRef.current = requestAnimationFrame(() => {
        mouseRafRef.current = 0;
        const el = containerRef.current;
        if (!el) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{
        zIndex: -1,
        background: "var(--gamibar-page)",
        "--mx": "50%",
        "--my": "40%",
      } as CSSProperties}
    >
      {/* Static grain */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />

      {/* Very subtle cursor wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px circle at var(--mx) var(--my), rgba(255,255,255,0.14), transparent 75%)",
        }}
      />

      {/* Uniform faint grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.04] dark:opacity-[0.08]">
        <defs>
          <pattern id="ambient-grid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M52 0H0V52" fill="none" stroke="var(--gamibar-border)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ambient-grid)" />
      </svg>
    </div>
  );
}
