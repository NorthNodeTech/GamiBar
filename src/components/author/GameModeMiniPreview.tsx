import gameConnectDotsPreview from "@/assets/game-connect-dots-preview.png";
import gameJigsawPreview from "@/assets/game-jigsaw-preview.webp";
import gameQuizPreview from "@/assets/game-quiz-preview.webp";
import type { GameMode } from "@/lib/game/config";
import { cn } from "@/lib/utils";

const previews: Partial<Record<GameMode, string>> = {
  quiz: gameQuizPreview,
  quiz_jigsaw: gameJigsawPreview,
  jigsaw: gameJigsawPreview,
  connect_dots: gameConnectDotsPreview,
};

type GameModeMiniPreviewProps = {
  mode: GameMode;
  className?: string;
  size?: "sm" | "md";
};

/** Compact gameplay thumbnail — uses real mode preview assets. */
export function GameModeMiniPreview({ mode, className, size = "sm" }: GameModeMiniPreviewProps) {
  const src = previews[mode] ?? gameQuizPreview;
  const sizeClass = size === "md" ? "size-16 sm:size-20" : "size-12 sm:size-14";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5",
        sizeClass,
        modeTint(mode),
        className,
      )}
    >
      <img src={src} alt="" className="size-full object-cover object-center" loading="lazy" />
      <ModeDecor mode={mode} />
    </div>
  );
}

function modeTint(mode: GameMode): string {
  switch (mode) {
    case "quiz":
    case "quiz_jigsaw":
      return "bg-[var(--game-quiz-soft)]";
    case "jigsaw":
      return "bg-[var(--game-jigsaw-soft)]";
    case "connect_dots":
      return "bg-[var(--game-connect-dots-soft)]";
    default:
      return "bg-[var(--gamibar-page)]";
  }
}

function ModeDecor({ mode }: { mode: GameMode }) {
  if (mode === "connect_dots") {
    return (
      <svg
        className="pointer-events-none absolute inset-0 size-full opacity-30"
        viewBox="0 0 48 48"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" fill="var(--game-connect-dots)" />
        <circle cx="36" cy="36" r="3" fill="var(--game-connect-dots)" />
        <path
          d="M12 12 Q24 8 36 36"
          stroke="var(--game-connect-dots)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    );
  }
  if (mode === "jigsaw" || mode === "quiz_jigsaw") {
    return (
      <div
        className="pointer-events-none absolute inset-1 grid grid-cols-2 grid-rows-2 gap-px opacity-25"
        aria-hidden
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-[2px] bg-[var(--game-jigsaw)]" />
        ))}
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute bottom-1 left-1 right-1 flex justify-center gap-0.5 opacity-40" aria-hidden>
      {["A", "B", "C", "D"].map((l) => (
        <span
          key={l}
          className="grid size-3 place-items-center rounded bg-[var(--game-quiz)] text-[6px] font-bold text-white"
        >
          {l}
        </span>
      ))}
    </div>
  );
}

export function modeLabel(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Quiz";
    case "quiz_jigsaw":
      return "Puzzle Quest";
    case "jigsaw":
      return "Jigsaw";
    case "connect_dots":
      return "Connect Dots";
    default:
      return mode;
  }
}
