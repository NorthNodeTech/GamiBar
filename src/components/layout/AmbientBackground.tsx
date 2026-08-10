import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/* ─── Jigsaw SVG path variants ───────────────────────────────── */
type V = "A" | "B" | "C" | "D" | "E" | "F";
const PATH: Record<V, string> = {
  A: "M15,15 H42 C38,-2 62,-2 58,15 H85 V42 C102,38 102,62 85,58 V85 H58 C62,102 38,102 42,85 H15 V58 C-2,62 -2,38 15,42 Z",
  B: "M15,15 H58 C54,-2 46,-2 42,15 H85 V42 C68,38 68,62 85,58 V85 H42 C46,102 54,102 58,85 H15 V58 C32,62 32,38 15,42 Z",
  C: "M15,15 H85 V42 C102,38 102,62 85,58 V85 H58 C62,102 38,102 42,85 H15 V42 C-2,38 -2,62 15,58 Z",
  D: "M15,15 H42 C38,-2 62,-2 58,15 H85 V85 H58 C62,102 38,102 42,85 H15 V58 C-2,62 -2,38 15,42 Z",
  E: "M15,15 H85 V58 C68,62 68,38 85,42 V85 H42 C46,102 54,102 58,85 H15 V42 C-2,38 -2,62 15,58 Z",
  F: "M15,15 H42 C38,-2 62,-2 58,15 H85 V42 C68,38 68,62 85,58 V85 H15 V58 C-2,62 -2,38 15,42 Z",
};

type Layer = "far" | "mid" | "near";
type RoamClass = "ambient-roam-a" | "ambient-roam-b" | "ambient-roam-c" | "ambient-roam-d" | "ambient-roam-e" | "ambient-roam-f";

const ROAM_KEYFRAMES: Record<RoamClass, string> = {
  "ambient-roam-a": "ambient-roam-a",
  "ambient-roam-b": "ambient-roam-b",
  "ambient-roam-c": "ambient-roam-c",
  "ambient-roam-d": "ambient-roam-d",
  "ambient-roam-e": "ambient-roam-e",
  "ambient-roam-f": "ambient-roam-f",
};

interface Piece {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
  initRot: number;
  duration: number;
  delay: number;
  variant: V;
  layer: Layer;
  roam: RoamClass;
  assembly?: boolean;
  glider?: boolean;
}

const LAYER_SCALE: Record<Layer, number> = { far: 0.88, mid: 1, near: 1.06 };
const LAYER_PARALLAX: Record<Layer, number> = { far: 4, mid: 10, near: 16 };

const ASSEMBLY_TARGETS: Record<number, { x: number; y: number; rotate: number }> = {
  0: { x: 22, y: 16, rotate: 0 },
  1: { x: -26, y: 18, rotate: 0 },
  2: { x: 24, y: -16, rotate: 0 },
  3: { x: -22, y: -14, rotate: 0 },
};

/* Perimeter-only placement - hero center (≈25–75% x, 15–55% y) stays clear */
const PIECES: Piece[] = [
  // Assembly cluster - far top-right corner only
  { id: 0, left: "86%", top: "5%", size: 120, opacity: 0.52, initRot: -12, duration: 34, delay: 0, variant: "A", layer: "near", roam: "ambient-roam-a", assembly: true },
  { id: 1, left: "93%", top: "14%", size: 120, opacity: 0.52, initRot: 18, duration: 36, delay: 2, variant: "B", layer: "near", roam: "ambient-roam-b", assembly: true },
  { id: 2, left: "84%", top: "22%", size: 120, opacity: 0.52, initRot: 8, duration: 32, delay: 4, variant: "C", layer: "near", roam: "ambient-roam-c", assembly: true },
  { id: 3, left: "91%", top: "28%", size: 120, opacity: 0.52, initRot: -20, duration: 38, delay: 1, variant: "D", layer: "near", roam: "ambient-roam-d", assembly: true },
  // Glider - left edge, below hero
  { id: 4, left: "3%", top: "62%", size: 130, opacity: 0.48, initRot: 16, duration: 40, delay: 1.5, variant: "E", layer: "mid", roam: "ambient-roam-e", glider: true },
  // Corner anchors - edge-cropped
  { id: 5, left: "-7%", top: "2%", size: 200, opacity: 0.40, initRot: -28, duration: 44, delay: 0, variant: "F", layer: "far", roam: "ambient-roam-f" },
  { id: 6, left: "94%", top: "-4%", size: 210, opacity: 0.40, initRot: 32, duration: 46, delay: 2, variant: "A", layer: "far", roam: "ambient-roam-a" },
  { id: 7, left: "-8%", top: "78%", size: 195, opacity: 0.38, initRot: 20, duration: 42, delay: 1, variant: "B", layer: "far", roam: "ambient-roam-b" },
  { id: 8, left: "93%", top: "82%", size: 200, opacity: 0.38, initRot: -22, duration: 48, delay: 3, variant: "C", layer: "far", roam: "ambient-roam-c" },
  // Side-edge roamers - left & right strips
  { id: 9, left: "4%", top: "32%", size: 140, opacity: 0.46, initRot: -9, duration: 35, delay: 2, variant: "D", layer: "mid", roam: "ambient-roam-d" },
  { id: 10, left: "91%", top: "48%", size: 145, opacity: 0.46, initRot: 13, duration: 37, delay: 4, variant: "E", layer: "mid", roam: "ambient-roam-e" },
  { id: 11, left: "10%", top: "6%", size: 135, opacity: 0.44, initRot: -16, duration: 33, delay: 1, variant: "F", layer: "mid", roam: "ambient-roam-f" },
  { id: 12, left: "78%", top: "4%", size: 138, opacity: 0.44, initRot: -11, duration: 39, delay: 3, variant: "A", layer: "mid", roam: "ambient-roam-a" },
  // Bottom band - spread horizontally
  { id: 13, left: "12%", top: "88%", size: 142, opacity: 0.44, initRot: 24, duration: 41, delay: 2, variant: "B", layer: "mid", roam: "ambient-roam-b" },
  { id: 14, left: "68%", top: "90%", size: 138, opacity: 0.44, initRot: -7, duration: 36, delay: 5, variant: "C", layer: "mid", roam: "ambient-roam-c" },
];

type AssemblyPhase = "idle" | "converge" | "hold" | "separate";

function getJigsawSlotRect(): DOMRect | null {
  const games = document.querySelector("#games");
  if (!games) return null;
  const cards = games.querySelectorAll(":scope > .grid > *");
  if (cards.length < 2) return null;
  const jigsawWrap = cards[1] as Element | undefined;
  if (!jigsawWrap) return null;
  const slot = jigsawWrap.querySelector('[class*="border-dashed"]');
  if (!slot) return null;
  return slot.getBoundingClientRect();
}

/* ─────────────────────────────────────────────────────────────────
   Main AmbientBackground Component
───────────────────────────────────────────────────────────────── */
export function AmbientBackground() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  const containerRef = useRef<HTMLDivElement>(null);
  const assemblyPhaseRef = useRef<AssemblyPhase>("idle");
  const [assemblyPhase, setAssemblyPhase] = useState<AssemblyPhase>("idle");
  const [gliderPhase, setGliderPhase] = useState<"idle" | "flying" | "snapped" | "returning">("idle");
  const [gliderPos, setGliderPos] = useState<{ x: number; y: number; scale: number; rotate: number } | null>(null);

  const assemblyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gliderTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gliderPhaseRef = useRef<"idle" | "flying" | "snapped" | "returning">("idle");
  const mouseRafRef = useRef(0);

  /* Mouse via CSS vars - no React re-renders */
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
        el.style.setProperty("--px", `${(x - 0.5) * LAYER_PARALLAX.near}px`);
        el.style.setProperty("--py", `${(y - 0.5) * LAYER_PARALLAX.near}px`);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
    };
  }, []);

  const runAssembly = useCallback(() => {
    assemblyPhaseRef.current = "converge";
    setAssemblyPhase("converge");
    assemblyTimerRef.current = setTimeout(() => {
      assemblyPhaseRef.current = "hold";
      setAssemblyPhase("hold");
    }, 3800);
    setTimeout(() => {
      assemblyPhaseRef.current = "separate";
      setAssemblyPhase("separate");
    }, 5800);
    setTimeout(() => {
      assemblyPhaseRef.current = "idle";
      setAssemblyPhase("idle");
    }, 9200);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const delay = 15000 + Math.random() * 5000;
      assemblyTimerRef.current = setTimeout(() => {
        runAssembly();
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (assemblyTimerRef.current) clearTimeout(assemblyTimerRef.current);
    };
  }, [runAssembly]);

  const runGlider = useCallback(async () => {
    if (!isHome || gliderPhaseRef.current !== "idle") return;
    const slot = getJigsawSlotRect();
    if (!slot) return;

    const gliderPiece = PIECES.find((p) => p.glider)!;
    const startEl = document.querySelector(`[data-ambient-piece="${gliderPiece.id}"]`);
    const startRect = startEl?.getBoundingClientRect();
    if (!startRect) return;

    gliderPhaseRef.current = "flying";
    setGliderPhase("flying");
    setGliderPos({
      x: startRect.left + startRect.width / 2,
      y: startRect.top + startRect.height / 2,
      scale: 1,
      rotate: gliderPiece.initRot,
    });

    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 50));

    setGliderPos({
      x: slot.left + slot.width / 2,
      y: slot.top + slot.height / 2,
      scale: slot.width / gliderPiece.size,
      rotate: 0,
    });
    await new Promise((r) => setTimeout(r, 2200));

    gliderPhaseRef.current = "snapped";
    setGliderPhase("snapped");
    await new Promise((r) => setTimeout(r, 1800));

    gliderPhaseRef.current = "returning";
    setGliderPhase("returning");
    setGliderPos({
      x: startRect.left + startRect.width / 2,
      y: startRect.top + startRect.height / 2,
      scale: 1,
      rotate: gliderPiece.initRot,
    });
    await new Promise((r) => setTimeout(r, 2400));
    gliderPhaseRef.current = "idle";
    setGliderPhase("idle");
    setGliderPos(null);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      gliderPhaseRef.current = "idle";
      setGliderPhase("idle");
      setGliderPos(null);
      return;
    }

    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      const delay = 22000 + Math.random() * 12000;
      gliderTimerRef.current = setTimeout(() => {
        void runGlider().finally(schedule);
      }, delay);
    };
    const initial = setTimeout(() => void runGlider().finally(schedule), 8000);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (gliderTimerRef.current) clearTimeout(gliderTimerRef.current);
    };
  }, [isHome, runGlider]);

  const assemblyTransition = useMemo(
    () => ({
      converge: { duration: 3.8, ease: [0.25, 0.1, 0.25, 1] as const },
      hold: { duration: 0.3, ease: "linear" as const },
      separate: { duration: 3.4, ease: [0.25, 0.1, 0.25, 1] as const },
      idle: { duration: 3.4, ease: [0.25, 0.1, 0.25, 1] as const },
    }),
    [],
  );

  const gliderPiece = PIECES.find((p) => p.glider)!;

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
        "--px": "0px",
        "--py": "0px",
      } as CSSProperties}
    >
      {/* Shared SVG defs - one set for all pieces */}
      <svg aria-hidden className="absolute h-0 w-0" focusable="false">
        <defs>
          {(Object.keys(PATH) as V[]).map((v) => (
            <g key={v} id={`ambient-piece-${v}`}>
              <linearGradient id={`glass-${v}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop className="ambient-glass-a" offset="0%" stopColor="#D8E4EE" stopOpacity="0.85" />
                <stop className="ambient-glass-b" offset="40%" stopColor="#A8BFD4" stopOpacity="0.65" />
                <stop className="ambient-glass-c" offset="100%" stopColor="#7A96B0" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id={`sheen-${v}`} x1="0%" y1="0%" x2="45%" y2="45%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
              <filter id={`shadow-${v}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.06)" />
              </filter>
            </g>
          ))}
        </defs>
      </svg>

      {/* Static grain */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />

      {/* Very subtle cursor wash - no hard edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px circle at var(--mx) var(--my), rgba(255,255,255,0.18), transparent 75%)",
        }}
      />

      {/* Uniform faint grid - no center mask box */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.07] dark:opacity-[0.12]">
        <defs>
          <pattern id="ambient-grid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M52 0H0V52" fill="none" stroke="var(--gamibar-border)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ambient-grid)" />
      </svg>

      {/* Blueprint / maze outlines - CSS animation only */}
      <div className="absolute left-2 top-[26%] text-[var(--muted-foreground)]" style={{ animation: "ambient-blueprint-drift 28s ease-in-out infinite" }}>
        <svg viewBox="0 0 140 140" width={125} height={125} fill="none" stroke="currentColor" strokeWidth="0.8" opacity={0.1}>
          <rect x="8" y="8" width="124" height="124" strokeDasharray="4 5" />
          <rect x="32" y="32" width="76" height="76" strokeDasharray="3 4" />
          <rect x="56" y="56" width="28" height="28" strokeDasharray="2 3" />
        </svg>
      </div>
      <div className="absolute right-3 top-[18%] text-[var(--muted-foreground)]" style={{ animation: "ambient-blueprint-drift 32s ease-in-out infinite reverse" }}>
        <svg viewBox="0 0 160 160" width={140} height={140} fill="none" stroke="currentColor" strokeWidth="0.8" opacity={0.09}>
          <rect x="8" y="8" width="72" height="72" strokeDasharray="3 4" />
          <rect x="80" y="8" width="72" height="72" strokeDasharray="3 4" />
          <rect x="8" y="80" width="72" height="72" strokeDasharray="3 4" />
          <rect x="80" y="80" width="72" height="72" strokeDasharray="3 4" />
        </svg>
      </div>
      <div className="absolute bottom-[18%] left-3 text-[var(--muted-foreground)]" style={{ animation: "ambient-blueprint-drift 34s ease-in-out infinite" }}>
        <svg viewBox="0 0 120 120" width={110} height={110} fill="none" stroke="currentColor" strokeWidth="0.7" opacity={0.08}>
          <rect x="10" y="10" width="100" height="100" rx="2" strokeDasharray="3 4" />
          <path d="M10 40 H50 V70 H90 V100" strokeDasharray="2 3" />
          <path d="M30 10 V50 H70 V90 H110" strokeDasharray="2 3" />
        </svg>
      </div>
      <div className="absolute bottom-[22%] right-4 text-[var(--muted-foreground)]" style={{ animation: "ambient-blueprint-drift 36s ease-in-out infinite reverse" }}>
        <svg viewBox="0 0 100 100" width={95} height={95} fill="none" stroke="currentColor" strokeWidth="0.7" opacity={0.08}>
          <rect x="8" y="8" width="84" height="84" rx="2" strokeDasharray="3 4" />
          <path d="M8 35 H35 V65 H65 V92" strokeDasharray="2 3" />
          <path d="M35 8 V35 H65 V65 H92" strokeDasharray="2 3" />
        </svg>
      </div>

      {/* Floating puzzle pieces */}
      {PIECES.map((p) =>
        p.assembly ? (
          <AssemblyPiece
            key={p.id}
            piece={p}
            assemblyPhase={assemblyPhase}
            assemblyTransition={assemblyTransition}
          />
        ) : (
          <DriftingPiece
            key={p.id}
            piece={p}
            hidden={Boolean(p.glider && gliderPhase !== "idle")}
          />
        ),
      )}

      {/* Glider overlay */}
      {gliderPos && (
        <motion.div
          className="pointer-events-none fixed"
          style={{
            left: gliderPos.x,
            top: gliderPos.y,
            x: "-50%",
            y: "-50%",
            zIndex: 0,
          }}
          animate={{
            left: gliderPos.x,
            top: gliderPos.y,
            scale: gliderPos.scale,
            rotate: gliderPos.rotate,
            opacity: gliderPhase === "snapped" ? 0.72 : gliderPhase === "flying" ? 0.62 : 0.48,
          }}
          transition={{
            duration: gliderPhase === "snapped" ? 0.3 : gliderPhase === "returning" ? 2.4 : 2.2,
            ease: gliderPhase === "flying" ? [0.22, 1, 0.36, 1] : [0.25, 0.1, 0.25, 1],
          }}
        >
          <PuzzlePiece size={gliderPiece.size} opacity={0.62} variant="E" assembled />
        </motion.div>
      )}
    </div>
  );
}

/* ─── CSS-driven drifter - GPU keyframes, no JS loop ─── */
function roamStyle(p: Piece): CSSProperties {
  return {
    animation: `${ROAM_KEYFRAMES[p.roam]} ${p.duration}s ease-in-out infinite`,
    animationDelay: `${p.delay}s`,
    willChange: "transform",
  };
}

const DriftingPiece = memo(function DriftingPiece({
  piece: p,
  hidden,
}: {
  piece: Piece;
  hidden: boolean;
}) {
  const parallaxFactor = LAYER_PARALLAX[p.layer] / LAYER_PARALLAX.near;

  return (
    <div
      data-ambient-piece={p.id}
      className="absolute pointer-events-none"
      style={{
        left: p.left,
        top: p.top,
        scale: LAYER_SCALE[p.layer],
        opacity: hidden ? 0 : 1,
        translate: `calc(var(--px) * ${parallaxFactor}) calc(var(--py) * ${parallaxFactor})`,
        transition: "opacity 0.4s ease",
      }}
    >
      <div style={{ rotate: `${p.initRot}deg` }}>
        <div style={roamStyle(p)}>
          <PuzzlePiece size={p.size} opacity={p.opacity} variant={p.variant} />
        </div>
      </div>
    </div>
  );
});

/* ─── Assembly cluster - framer-motion only when converging ─── */
function AssemblyPiece({
  piece: p,
  assemblyPhase,
  assemblyTransition,
}: {
  piece: Piece;
  assemblyPhase: AssemblyPhase;
  assemblyTransition: Record<AssemblyPhase, { duration: number; ease: readonly number[] | string }>;
}) {
  const target = ASSEMBLY_TARGETS[p.id]!;
  const parallaxFactor = LAYER_PARALLAX[p.layer] / LAYER_PARALLAX.near;
  const isAssembled = assemblyPhase === "hold" || assemblyPhase === "converge";

  const assemblyAnimate =
    assemblyPhase === "converge" || assemblyPhase === "hold"
      ? { x: target.x, y: target.y, rotate: target.rotate }
      : { x: [target.x, 0], y: [target.y, 0], rotate: [target.rotate, p.initRot] };

  const assemblyMotionTransition = {
    duration: assemblyTransition[assemblyPhase].duration,
    ease: assemblyTransition[assemblyPhase].ease as "easeInOut",
  };

  return (
    <div
      data-ambient-piece={p.id}
      className="absolute pointer-events-none"
      style={{
        left: p.left,
        top: p.top,
        scale: LAYER_SCALE[p.layer],
        translate: `calc(var(--px) * ${parallaxFactor}) calc(var(--py) * ${parallaxFactor})`,
      }}
    >
      {assemblyPhase === "idle" ? (
        <div style={{ rotate: `${p.initRot}deg` }}>
          <div style={roamStyle(p)}>
            <PuzzlePiece size={p.size} opacity={p.opacity} variant={p.variant} />
          </div>
        </div>
      ) : (
        <motion.div
          animate={assemblyAnimate}
          transition={assemblyMotionTransition}
          style={{ willChange: "transform" }}
        >
          <PuzzlePiece size={p.size} opacity={p.opacity} variant={p.variant} {...(isAssembled ? { assembled: true } : {})} />
        </motion.div>
      )}
    </div>
  );
}

/* ─── Puzzle piece SVG - shared defs, crisp edges ─── */
const PuzzlePiece = memo(function PuzzlePiece({
  size,
  opacity,
  variant,
  assembled,
}: {
  size: number;
  opacity: number;
  variant: V;
  assembled?: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        opacity: assembled ? Math.min(opacity * 1.15, 0.68) : opacity,
      }}
    >
      <svg viewBox="-18 -18 136 136" width={size} height={size} aria-hidden style={{ overflow: "visible", display: "block" }}>
        <path
          d={PATH[variant]}
          className="ambient-piece-fill"
          fill={`url(#glass-${variant})`}
          stroke="#5A7894"
          strokeWidth="2"
          strokeLinejoin="round"
          filter={`url(#shadow-${variant})`}
        />
        <path
          d={PATH[variant]}
          fill="none"
          className="ambient-piece-edge"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d={PATH[variant]} fill={`url(#sheen-${variant})`} stroke="none" opacity="0.7" />
      </svg>
    </div>
  );
});
