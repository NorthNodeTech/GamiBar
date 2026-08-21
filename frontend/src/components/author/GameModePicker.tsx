import { ArrowRight, Check, Zap, Radio, Blocks, CircleDot, Crosshair } from "lucide-react";

import { GAME_MODE_CATALOG, getCoreModeCatalog } from "@/lib/game/mode-catalog";
import type { GameMode } from "@shared/game/config";
import { GAME_MODE_META } from "@shared/game/config";
import { cn } from "@/lib/utils";

const MODE_PRESENTATION = {
  quiz: {
    moment: "Speed & Trivia",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    accentColor: "bg-[#FF3B30]",
    useCase: "High-energy revision battle with live speed & accuracy leaderboards.",
    highlights: ["Unlimited MCQs with instant scoring", "Podium rankings & streak bonus"],
  },
  polls: {
    moment: "Live Feedback",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    accentColor: "bg-orange-500",
    useCase: "Gather audience opinions, rating scales, and quick pulse checks.",
    highlights: ["Rating scales, MCQ & text responses", "Real-time animated live charts"],
  },
  jigsaw: {
    moment: "Puzzle & Teamwork",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    accentColor: "bg-blue-500",
    useCase: "Answer questions to unlock puzzle pieces and reconstruct the image.",
    highlights: ["2×2, 3×3, or 4×4 custom grids", "Upload any diagram, slide, or photo"],
  },
  connect_dots: {
    moment: "Logic & Matching",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentColor: "bg-emerald-500",
    useCase: "Interactive line-drawing game connecting concept pairs and terms.",
    highlights: ["2 to 10 matching concept pairs", "Live interactive connection grid"],
  },
  visual_point: {
    moment: "Image Spotting",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    accentColor: "bg-purple-500",
    useCase: "Pinpoint exact anatomical organs, map locations, or circuit targets.",
    highlights: ["Spot-the-target visual questions", "Pixel-precise coordinate checking"],
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
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch"
      role="radiogroup"
      aria-label="Select Game Mode"
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
  const presentation =
    MODE_PRESENTATION[item.mode as keyof typeof MODE_PRESENTATION] ?? MODE_PRESENTATION.quiz;

  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      className={cn(
        "group relative flex flex-col justify-between rounded-3xl border bg-white text-left transition-all duration-200 overflow-hidden outline-none",
        selected
          ? "border-[#FF3B30] ring-2 ring-[#FF3B30] shadow-[0_12px_32px_rgba(255,59,48,0.14)]"
          : "border-[#E7E9ED] shadow-xs hover:border-[#CBD5E1] hover:shadow-md hover:-translate-y-0.5",
      )}
    >
      <div className="flex flex-col w-full">
        {/* Edge-to-Edge Fitted Banner Image (No Gaps/Padding) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 border-b border-[#F0F2F5]">
          <img
            src={item.preview}
            alt={GAME_MODE_META[item.mode].title}
            className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Floating Pill on Image */}
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border",
              presentation.badgeColor,
            )}
          >
            <Icon className="size-3 shrink-0" />
            <span>{presentation.moment}</span>
          </span>

          {/* Top-Right Checkmark Badge */}
          {selected && (
            <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-[#FF3B30] text-white shadow-md ring-2 ring-white animate-in zoom-in-75 duration-150">
              <Check className="size-4 stroke-[3]" />
            </span>
          )}
        </div>

        {/* Card Body & Information */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#111111] leading-tight">
              {GAME_MODE_META[item.mode].title}
            </h3>
            <p className="mt-1.5 text-xs text-[#5F6368] leading-relaxed line-clamp-2">
              {presentation.useCase}
            </p>
          </div>

          {/* Highlights Bullets */}
          <div className="mt-4 space-y-1.5 border-t border-[#F0F2F5] pt-3 text-[11px] text-[#374151]">
            {presentation.highlights.map((feat) => (
              <div key={feat} className="flex items-start gap-1.5 leading-tight">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span className="font-medium text-[#4B5563]">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer Button */}
      <div
        className={cn(
          "flex items-center justify-between border-t px-4 py-2.5 text-xs font-bold transition-colors",
          selected
            ? "border-red-200 bg-red-50 text-[#FF3B30]"
            : "border-[#F0F2F5] bg-[#FAFAFA] text-[#5F6368] group-hover:bg-[#F3F4F6] group-hover:text-[#111111]",
        )}
      >
        <span>{selected ? "Selected" : "Select tool"}</span>
        {selected ? (
          <Check className="size-3.5 stroke-[2.5]" />
        ) : (
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </button>
  );
}
