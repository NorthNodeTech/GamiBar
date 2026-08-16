import { Clock, Infinity } from "lucide-react";
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

import { GAME_CONFIG, type GameMode } from "@/lib/game/config";
import {
  clampTimer,
  formatTimerLong,
  formatTimerSeconds,
  TIMER_BOUNDS,
  TIMER_PRESETS,
} from "@/lib/game/timer";
import { cn } from "@/lib/utils";

const MODE_STYLE: Record<
  GameMode,
  { ring: string; soft: string; text: string; glow: string; track: string }
> = {
  quiz: {
    ring: "border-[var(--game-quiz)]/25",
    soft: "bg-[var(--game-quiz-soft)]",
    text: "text-[var(--game-quiz-deep)]",
    glow: "shadow-[0_24px_60px_rgba(239,68,68,0.12)]",
    track: "stroke-[var(--game-quiz)]",
  },
  quiz_jigsaw: {
    ring: "border-[#7C3AED]/25",
    soft: "bg-[#EDE9FE]",
    text: "text-[#5B21B6]",
    glow: "shadow-[0_24px_60px_rgba(124,58,237,0.12)]",
    track: "stroke-[#7C3AED]",
  },
  jigsaw: {
    ring: "border-[var(--game-jigsaw)]/25",
    soft: "bg-[var(--game-jigsaw-soft)]",
    text: "text-[var(--game-jigsaw-deep)]",
    glow: "shadow-[0_24px_60px_rgba(59,130,246,0.12)]",
    track: "stroke-[var(--game-jigsaw)]",
  },
  connect_dots: {
    ring: "border-[var(--game-connect-dots)]/25",
    soft: "bg-[var(--game-connect-dots-soft)]",
    text: "text-[var(--game-connect-dots-deep)]",
    glow: "shadow-[0_24px_60px_rgba(16,185,129,0.12)]",
    track: "stroke-[var(--game-connect-dots)]",
  },
};

type GameTimerSettingsProps = {
  mode: GameMode;
  value: number | null;
  onChange: (seconds: number | null) => void;
  className?: string;
};

function valueFromAngle(angleRad: number, min: number, max: number, step: number) {
  let normalized = (angleRad + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  const ratio = normalized / (Math.PI * 2);
  const raw = min + ratio * (max - min);
  const stepped = Math.round(raw / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

function thumbPosition(progress: number, size: number, radius: number) {
  const angle = progress * Math.PI * 2 - Math.PI / 2;
  const cx = size / 2;
  const cy = size / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function CircularTimerDial({
  value,
  min,
  max,
  step,
  onChange,
  style,
  openEnded = false,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (seconds: number) => void;
  style: (typeof MODE_STYLE)[GameMode];
  openEnded?: boolean;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const size = 212;
  const stroke = 12;
  const radius = 86;
  const innerSize = (radius - stroke / 2) * 2 - 28;
  const circumference = 2 * Math.PI * radius;
  const progress = openEnded ? 0 : (value - min) / (max - min);
  const dash = progress * circumference;
  const thumb = thumbPosition(progress, size, radius);

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (openEnded) return;
      const el = dialRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(clientY - cy, clientX - cx);
      onChange(valueFromAngle(angle, min, max, step));
    },
    [max, min, onChange, openEnded, step],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (openEnded) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (openEnded || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setFromPointer(event.clientX, event.clientY);
  };

  return (
    <div className="mx-auto flex flex-col items-center">
      <div
        ref={dialRef}
        className={cn(
          "relative touch-none select-none",
          openEnded ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        )}
        style={{ width: size, height: size }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={openEnded ? undefined : value}
        aria-label="Session timer"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none stroke-[#ECEEF2]"
            strokeWidth={stroke}
          />
          {!openEnded && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className={cn("fill-none transition-[stroke-dasharray] duration-200", style.track)}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          )}
        </svg>

        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#F3F4F6] bg-white text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          style={{ width: innerSize, height: innerSize }}
        >
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-xl",
              style.soft,
              style.text,
            )}
          >
            {openEnded ? <Infinity className="size-4" /> : <Clock className="size-4" />}
          </span>
          <p className="mt-1.5 font-display text-[2rem] font-extrabold leading-none tracking-tight text-[#111111] sm:text-[2.15rem]">
            {openEnded ? "Open" : formatTimerSeconds(value)}
          </p>
          {openEnded && (
            <p className="mt-1.5 text-[10px] font-medium leading-tight text-[#737373]">
              No limit
            </p>
          )}
        </div>

        {!openEnded && (
          <span
            className="absolute size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#111111] shadow-md transition-all duration-200"
            style={{ left: thumb.x, top: thumb.y }}
          />
        )}
      </div>

      {!openEnded && (
        <p className="mt-2 text-[11px] font-medium text-[#737373]">Drag the ring to adjust</p>
      )}
    </div>
  );
}

export function GameTimerSettings({ mode, value, onChange, className }: GameTimerSettingsProps) {
  const style = MODE_STYLE[mode];
  const presets = TIMER_PRESETS[mode];
  const bounds = TIMER_BOUNDS[mode];
  const openEnded = value == null;
  const displayValue = openEnded ? bounds.min : clampTimer(mode, value)!;
  const suggestedSeconds =
    mode === "quiz"
      ? GAME_CONFIG.quiz.recommendedSecondsPerQuestion * GAME_CONFIG.quiz.defaultQuestionCount
      : mode === "quiz_jigsaw"
        ? GAME_CONFIG.quiz_jigsaw.timeLimitSeconds ?? 600
        : mode === "jigsaw"
          ? GAME_CONFIG.jigsaw.timeLimitSeconds
          : GAME_CONFIG.connect_dots.timeLimitSeconds;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border bg-white",
        style.ring,
        style.glow,
        className,
      )}
    >
      <div className="px-4 pt-5 text-center sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373]">
          Session timer
        </p>
        <p className="mt-1 text-sm text-[#525252]">
          {openEnded
            ? "Students play until they finish — no countdown on screen."
            : `Students must finish before ${formatTimerLong(displayValue)}.`}
        </p>
      </div>

      <div className="px-4 py-2 sm:px-5">
        <CircularTimerDial
          value={displayValue}
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          onChange={(next) => onChange(clampTimer(mode, next))}
          style={style}
          openEnded={openEnded}
        />
        {!openEnded && (
          <div className="mx-auto mt-1 flex w-[212px] justify-between text-[10px] font-semibold text-[#737373]">
            <span>{formatTimerSeconds(bounds.min)}</span>
            <span>{formatTimerSeconds(bounds.max)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/70 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#737373]">
          Quick presets
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          {presets.map((preset) => {
            const active =
              preset.seconds == null ? value == null : clampTimer(mode, value) === preset.seconds;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.seconds)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
                  active
                    ? "border-[#111111] bg-[#111111] text-white shadow-md"
                    : "border-[var(--gamibar-border)] bg-white text-[#525252] hover:border-[#111111] hover:text-[#111111]",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {openEnded && suggestedSeconds != null && (
          <button
            type="button"
            onClick={() => onChange(clampTimer(mode, suggestedSeconds))}
            className="mt-4 w-full text-center text-xs font-semibold text-[#525252] underline-offset-2 hover:text-[#111111] hover:underline"
          >
            Prefer a countdown? Tap to set a {formatTimerSeconds(suggestedSeconds)} suggested limit.
          </button>
        )}
      </div>
    </section>
  );
}
