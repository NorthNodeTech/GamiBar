import gameConnectDotsPreview from "@/assets/tool-connect-dots.webp";
import gameJigsawPreview from "@/assets/tool-jigsaw-mission.webp";
import gamePollsPreview from "@/assets/tool-polls-survey.webp";
import gameQuizPreview from "@/assets/tool-quiz-battle.webp";
import type { GameMode } from "@/lib/game/config";
import { cn } from "@/lib/utils";

const previews: Partial<Record<GameMode, string>> = {
  quiz: gameQuizPreview,
  quiz_jigsaw: gameJigsawPreview,
  jigsaw: gameJigsawPreview,
  connect_dots: gameConnectDotsPreview,
  visual_point: gameJigsawPreview,
  polls: gamePollsPreview,
};

type GameModeMiniPreviewProps = {
  mode: GameMode;
  className?: string;
  size?: "sm" | "md";
};

/** Compact gameplay thumbnail using real mode preview assets. */
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
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-lg"
        loading="lazy"
      />
      <img src={src} alt="" className="relative z-10 size-full object-contain p-1" loading="lazy" />
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
    case "visual_point":
      return "bg-[var(--game-visual-point-soft)]";
    case "polls":
      return "bg-orange-100";
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
  if (mode === "polls") {
    return (
      <div
        className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end justify-center gap-1 opacity-45"
        aria-hidden
      >
        {[0.45, 0.7, 0.55, 0.85].map((height, index) => (
          <span
            key={index}
            className="w-1.5 rounded-full bg-orange-500"
            style={{ height: `${height * 1.7}rem` }}
          />
        ))}
      </div>
    );
  }
  if (mode === "visual_point") {
    return (
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-45"
        aria-hidden
      >
        <span className="absolute left-3 top-3 size-1.5 rounded-full bg-[var(--game-visual-point)]" />
        <span className="absolute right-3 top-4 size-1.5 rounded-full bg-[var(--game-visual-point)]" />
        <span className="absolute bottom-3 left-4 size-1.5 rounded-full bg-[var(--game-visual-point)]" />
        <span className="size-5 rounded-full border-2 border-[var(--game-visual-point)]" />
      </div>
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
    <div
      className="pointer-events-none absolute bottom-1 left-1 right-1 flex justify-center gap-0.5 opacity-40"
      aria-hidden
    >
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
    case "visual_point":
      return "Target Hunt";
    case "polls":
      return "Polls";
    default:
      return mode;
  }
}
