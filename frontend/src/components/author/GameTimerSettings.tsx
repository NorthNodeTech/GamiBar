import { Clock, Infinity as InfinityIcon } from "lucide-react";
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

import { GAME_CONFIG, type GameMode } from "@shared/game/config";
import type { TimerMode } from "@shared/game/types";
import {
  clampTimer,
  defaultTimerSeconds,
  formatTimerLong,
  formatTimerSeconds,
  timerBounds,
  timerPresets,
} from "@shared/game/timer";
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
  visual_point: {
    ring: "border-[var(--game-visual-point)]/25",
    soft: "bg-[var(--game-visual-point-soft)]",
    text: "text-[var(--game-visual-point-deep)]",
    glow: "shadow-[0_24px_60px_rgba(14,165,233,0.12)]",
    track: "stroke-[var(--game-visual-point)]",
  },
  polls: {
    ring: "border-orange-400/25",
    soft: "bg-orange-100",
    text: "text-orange-800",
    glow: "shadow-[0_24px_60px_rgba(249,115,22,0.12)]",
    track: "stroke-orange-500",
  },
};

type GameTimerSettingsProps = {
  mode: GameMode;
  timerMode: TimerMode;
  value: number | null;
  onTimerModeChange: (mode: TimerMode) => void;
  onChange: (seconds: number | null) => void;
  className?: string;
};

function valueFromAngle(angleRad: number, min: number, max: number, step: number) {
  const normalized = (angleRad + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
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
  const size = 148;
  const stroke = 9;
  const radius = 58;
  const innerSize = (radius - stroke / 2) * 2 - 18;
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
              "grid size-6 shrink-0 place-items-center rounded-lg",
              style.soft,
              style.text,
            )}
          >
            {openEnded ? <InfinityIcon className="size-3.5" /> : <Clock className="size-3.5" />}
          </span>
          <p className="mt-0.5 font-display text-[1.45rem] font-extrabold leading-none tracking-tight text-[#111111]">
            {openEnded ? "Open" : formatTimerSeconds(value)}
          </p>
          {openEnded && (
            <p className="mt-0.5 text-[9px] font-medium leading-tight text-[#737373]">No limit</p>
          )}
        </div>

        {!openEnded && (
          <span
            className="absolute size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white bg-[#111111] shadow-md transition-all duration-200"
            style={{ left: thumb.x, top: thumb.y }}
          />
        )}
      </div>

      {!openEnded && (
        <p className="mt-1 text-[10px] font-medium text-[#737373]">Drag ring to adjust</p>
      )}
    </div>
  );
}

export function GameTimerSettings({
  mode,
  timerMode,
  value,
  onTimerModeChange,
  onChange,
  className,
}: GameTimerSettingsProps) {
  const style = MODE_STYLE[mode];
  const presets = timerPresets(mode, timerMode);
  const bounds = timerBounds(mode, timerMode);
  const openEnded = value == null;
  const displayValue = openEnded ? bounds.min : clampTimer(mode, value, timerMode)!;
  const suggestedSeconds =
    timerMode === "per_question"
      ? defaultTimerSeconds(mode, timerMode)
      : mode === "quiz"
        ? GAME_CONFIG.quiz.recommendedSecondsPerQuestion * GAME_CONFIG.quiz.defaultQuestionCount
        : mode === "quiz_jigsaw"
          ? (GAME_CONFIG.quiz_jigsaw.timeLimitSeconds ?? 600)
          : mode === "jigsaw"
            ? GAME_CONFIG.jigsaw.timeLimitSeconds
            : mode === "visual_point"
              ? GAME_CONFIG.visual_point.timeLimitSeconds
              : mode === "polls"
                ? GAME_CONFIG.polls.timeLimitSeconds
                : GAME_CONFIG.connect_dots.timeLimitSeconds;

  return (
    <section
      className={cn(
        "flex h-full flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm",
        style.ring,
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#737373]">
            Timer style
          </p>
          <div className="grid grid-cols-2 rounded-lg bg-[var(--gamibar-page)] p-0.5">
            {(
              [
                ["overall", "Whole game"],
                ["per_question", mode === "connect_dots" ? "Each pair" : "Per question"],
              ] as const
            ).map(([nextMode, label]) => (
              <button
                key={nextMode}
                type="button"
                aria-pressed={timerMode === nextMode}
                onClick={() => onTimerModeChange(nextMode)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-bold transition-all",
                  timerMode === nextMode
                    ? "bg-white text-[#111111] shadow-xs"
                    : "text-[#737373] hover:text-[#111111]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="my-2.5 flex justify-center">
          <CircularTimerDial
            value={displayValue}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onChange={(next) => onChange(clampTimer(mode, next, timerMode))}
            style={style}
            openEnded={openEnded}
          />
        </div>

        <p className="text-center text-[11px] leading-snug text-[#525252]">
          {openEnded
            ? "Play at own pace — no countdown."
            : timerMode === "per_question"
              ? `${formatTimerLong(displayValue)} per question (auto-skips).`
              : `${formatTimerLong(displayValue)} total game (auto-submits).`}
        </p>
      </div>

      <div className="mt-3 border-t border-[var(--gamibar-border)] pt-2.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#737373]">
          Quick presets
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active =
              preset.seconds == null
                ? value == null
                : clampTimer(mode, value, timerMode) === preset.seconds;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.seconds)}
                className={cn(
                  "rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-all",
                  active
                    ? "border-[#111111] bg-[#111111] text-white shadow-xs"
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
            onClick={() => onChange(clampTimer(mode, suggestedSeconds, timerMode))}
            className="mt-2 block w-full text-center text-[10px] font-medium text-[#525252] underline-offset-2 hover:text-[#111111] hover:underline"
          >
            Set suggested {formatTimerSeconds(suggestedSeconds)} limit
          </button>
        )}
      </div>
    </section>
  );
}
