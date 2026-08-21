import { ArrowRight, Check } from "lucide-react";

import { GAME_MODE_CATALOG, getCoreModeCatalog } from "@/lib/game/mode-catalog";
import type { GameMode } from "@shared/game/config";
import { GAME_MODE_META } from "@shared/game/config";
import { cn } from "@/lib/utils";

const MODE_PRESENTATION = {
  quiz: {
    moment: "Fast recall",
    useCase: "Knowledge checks and revision",
    accent: "bg-[var(--game-quiz)]",
    soft: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]",
    selected: "border-[var(--game-quiz)] ring-2 ring-[var(--game-quiz)]/15",
  },
  jigsaw: {
    moment: "Visual teamwork",
    useCase: "Concept review through reconstruction",
    accent: "bg-[var(--game-jigsaw)]",
    soft: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]",
    selected: "border-[var(--game-jigsaw)] ring-2 ring-[var(--game-jigsaw)]/15",
  },
  connect_dots: {
    moment: "Logic and matching",
    useCase: "Terms, answers, and relationships",
    accent: "bg-[var(--game-connect-dots)]",
    soft: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
    selected: "border-[var(--game-connect-dots)] ring-2 ring-[var(--game-connect-dots)]/15",
  },
  visual_point: {
    moment: "Image identification",
    useCase: "Maps, diagrams, anatomy, and circuits",
    accent: "bg-[var(--game-visual-point)]",
    soft: "bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]",
    selected: "border-[var(--game-visual-point)] ring-2 ring-[var(--game-visual-point)]/15",
  },
  polls: {
    moment: "Live feedback",
    useCase: "Polls, ratings, and quick surveys",
    accent: "bg-orange-500",
    soft: "bg-orange-100 text-orange-800",
    selected: "border-orange-400 ring-2 ring-orange-400/15",
  },
} as const;

export function GameModePicker({
  value,
  onChange,
}: {
  value: GameMode | null;
  onChange: (mode: GameMode) => void;
}) {
  const catalog = getCoreModeCatalog();

  return (
    <div
      className="grid gap-3 md:grid-cols-3 xl:grid-cols-5"
      role="radiogroup"
      aria-label="Game modes"
    >
      {catalog.map((item) => (
        <PickerCard
          key={item.mode}
          item={item}
          selected={value === item.mode}
          onSelect={() => onChange(item.mode)}
        />
      ))}
    </div>
  );
}

function PickerCard({
  item,
  selected,
  onSelect,
}: {
  item: (typeof GAME_MODE_CATALOG)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  const presentation = MODE_PRESENTATION[item.mode as keyof typeof MODE_PRESENTATION];

  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      className={cn(
        "tap-target group relative grid min-h-[8.5rem] w-full grid-cols-[5.75rem_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-[var(--gamibar-surface)] text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--gamibar-text-tertiary)] hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gamibar-brand)] focus-visible:ring-offset-2 md:min-h-[22rem] md:grid-cols-1 md:grid-rows-[9.5rem_minmax(0,1fr)_2.75rem]",
        selected ? presentation.selected : "border-[var(--gamibar-border)]",
      )}
    >
      <span className="relative min-h-full overflow-hidden bg-[var(--gamibar-page)] md:min-h-0">
        <img
          src={item.preview}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-xl"
          loading="lazy"
        />
        <img
          src={item.preview}
          alt=""
          className="relative z-10 size-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span
          aria-hidden
          className={cn(
            "absolute left-2 top-2 grid size-8 place-items-center rounded-lg border border-white/70 shadow-sm backdrop-blur-sm md:left-3 md:top-3 md:size-9",
            presentation.soft,
          )}
        >
          <Icon className="size-4" />
        </span>
        <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-1", presentation.accent)} />
      </span>

      <span className="flex min-w-0 flex-col justify-center p-3.5 md:block md:p-4">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gamibar-text-tertiary)]">
          {presentation.moment}
        </span>
        <span className="flex items-start justify-between gap-2">
          <span className="font-display text-base font-bold text-[var(--foreground)] sm:text-lg">
            {GAME_MODE_META[item.mode].title}
          </span>
          {selected ? (
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-white",
                presentation.accent,
              )}
            >
              <Check className="size-3.5" />
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--muted-foreground)]">
          {presentation.useCase}
        </span>
        <span className="mt-3 hidden space-y-1.5 md:block">
          {item.specs.slice(0, 2).map((spec) => (
            <span
              key={spec}
              className="flex items-start gap-2 text-[11px] leading-snug text-[var(--muted-foreground)]"
            >
              <span
                aria-hidden
                className={cn("mt-1 size-1.5 shrink-0 rounded-full", presentation.accent)}
              />
              {spec}
            </span>
          ))}
        </span>
      </span>

      <span className="hidden items-center justify-between border-t border-[var(--gamibar-border)] px-4 text-xs font-semibold md:flex">
        <span className={selected ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
          {selected ? "Selected" : "Choose mode"}
        </span>
        {selected ? (
          <Check className="size-4" />
        ) : (
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
    </button>
  );
}
