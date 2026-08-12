import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { GameModeMiniPreview } from "@/components/author/GameModeMiniPreview";
import { GAME_MODE_CATALOG, getCoreModeCatalog } from "@/lib/game/mode-catalog";
import type { GameMode } from "@/lib/game/config";
import { GAME_MODE_META } from "@/lib/game/config";
import { cn } from "@/lib/utils";

function ringOffset(index: number, active: number, length: number) {
  let diff = index - active;
  if (diff > length / 2) diff -= length;
  if (diff < -length / 2) diff += length;
  return diff;
}

function useCarouselShift() {
  const [shift, setShift] = useState(42);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 400) setShift(24);
      else if (w < 640) setShift(32);
      else if (w < 1024) setShift(42);
      else setShift(48);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return shift;
}

export function GameModePicker({
  value,
  onChange,
}: {
  value: GameMode | null;
  onChange: (mode: GameMode) => void;
}) {
  const catalog = getCoreModeCatalog();
  const count = catalog.length;
  const valueIndex = value ? catalog.findIndex((item) => item.mode === value) : -1;
  const [active, setActive] = useState(valueIndex >= 0 ? valueIndex : 0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const shiftPercent = useCarouselShift();
  const didPreselect = useRef(false);

  useEffect(() => {
    if (valueIndex >= 0 && valueIndex !== active) {
      setActive(valueIndex);
    }
  }, [valueIndex, active]);

  useEffect(() => {
    if (didPreselect.current || value != null) return;
    didPreselect.current = true;
    onChange(catalog[active]!.mode);
  }, [active, catalog, onChange, value]);

  const focusIndex = useCallback(
    (index: number) => {
      setActive(index);
      onChange(catalog[index]!.mode);
    },
    [catalog, onChange],
  );

  const goNext = useCallback(() => {
    focusIndex((active + 1) % count);
  }, [active, count, focusIndex]);

  const goPrev = useCallback(() => {
    focusIndex((active - 1 + count) % count);
  }, [active, count, focusIndex]);

  const activeItem = catalog[active]!;

  return (
    <>
      {/* Phone: stacked cards — no horizontal carousel overflow */}
      <div className="flex flex-col gap-3 md:hidden">
        {catalog.map((item, index) => (
          <PickerCard
            key={item.mode}
            item={item}
            selected={value === item.mode}
            featured={value === item.mode}
            onSelect={() => focusIndex(index)}
          />
        ))}
      </div>

      {/* Tablet+: carousel */}
      <div
        className="relative mx-auto hidden w-full md:block"
        onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return;
          const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          if (delta > 48) goPrev();
          else if (delta < -48) goNext();
          setTouchStartX(null);
        }}
      >
        <div className="relative px-12 lg:px-14">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous game mode"
            className="tap-target absolute left-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
          >
            <ChevronLeft className="size-4" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next game mode"
            className="tap-target absolute right-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
          >
            <ChevronRight className="size-4" />
          </button>

          <div
            className="relative mx-auto w-full max-w-[340px] overflow-visible lg:max-w-[380px]"
            style={{ perspective: "1400px" }}
          >
            <div className="pointer-events-none invisible" aria-hidden>
              <PickerCard item={activeItem} selected={value === activeItem.mode} />
            </div>

            {catalog.map((item, index) => {
              const offset = ringOffset(index, active, count);
              if (Math.abs(offset) > 1) return null;

              const isCenter = offset === 0;
              const shift = offset * shiftPercent;
              const selected = value === item.mode;

              return (
                <motion.div
                  key={item.mode}
                  className={cn(
                    "absolute left-1/2 top-0 w-full max-w-[340px] origin-center lg:max-w-[380px]",
                    !isCenter && "cursor-pointer",
                  )}
                  initial={false}
                  animate={{
                    x: `calc(-50% + ${shift}%)`,
                    scale: isCenter ? 1 : 0.88,
                    zIndex: isCenter ? 30 : 12 - Math.abs(offset),
                    opacity: isCenter ? 1 : 0.5,
                    rotateY: offset * -6,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  onClick={() => {
                    if (!isCenter) focusIndex(index);
                  }}
                  aria-hidden={!isCenter}
                >
                  <PickerCard
                    item={item}
                    selected={selected && isCenter}
                    featured={isCenter}
                    onSelect={() => focusIndex(index)}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Game modes">
          {catalog.map((item, index) => (
            <button
              key={item.mode}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Select ${GAME_MODE_META[item.mode].title}`}
              onClick={() => focusIndex(index)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === active
                  ? "w-6 bg-[var(--gamibar-brand)]"
                  : "w-2.5 bg-[var(--gamibar-border)]",
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function PickerCard({
  item,
  selected,
  featured,
  onSelect,
}: {
  item: (typeof GAME_MODE_CATALOG)[number];
  selected: boolean;
  featured?: boolean;
  onSelect?: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "tap-target group relative flex w-full min-h-[4.5rem] items-stretch gap-3 overflow-hidden rounded-2xl border bg-[var(--gamibar-surface)] p-3.5 text-left transition-all sm:gap-4 sm:p-4",
        selected
          ? cn("border-[var(--foreground)] ring-2 ring-[var(--gamibar-brand)]/15", item.glowClass)
          : "border-[var(--gamibar-border)]",
        featured && "shadow-[var(--shadow-lift)]",
      )}
    >
      <GameModeMiniPreview mode={item.mode} size="md" className="rounded-xl" />

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-base font-bold text-[var(--foreground)] sm:text-lg">
            {GAME_MODE_META[item.mode].title}
          </p>
          {selected ? (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)]">
              <Check className="size-3.5" />
            </span>
          ) : (
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", item.badgeClass)}>
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {item.specs.slice(0, 2).map((spec) => (
            <span
              key={spec}
              className="rounded-md bg-[var(--gamibar-page)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--muted-foreground)] sm:text-[10px]"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
