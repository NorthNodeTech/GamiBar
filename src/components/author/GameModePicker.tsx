import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { GAME_MODE_CATALOG } from "@/lib/game/mode-catalog";
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
  const catalog = GAME_MODE_CATALOG;
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
    <div
      className="relative mx-auto w-full overflow-visible"
      onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchStartX == null) return;
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
        if (delta > 48) goPrev();
        else if (delta < -48) goNext();
        setTouchStartX(null);
      }}
    >
      <div className="relative overflow-visible px-10 sm:px-14 md:px-16">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous game mode"
          className="absolute left-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface)] sm:size-11"
        >
          <ChevronLeft className="size-5" />
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="Next game mode"
          className="absolute right-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface)] sm:size-11"
        >
          <ChevronRight className="size-5" />
        </button>

        <div
          className="relative mx-auto w-full max-w-[min(100%,280px)] overflow-visible sm:max-w-[320px] md:max-w-[360px]"
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
                  "absolute left-1/2 top-0 w-full max-w-[min(100%,280px)] origin-center sm:max-w-[320px] md:max-w-[360px]",
                  !isCenter && "cursor-pointer",
                )}
                initial={false}
                animate={{
                  x: `calc(-50% + ${shift}%)`,
                  scale: isCenter ? 1 : 0.84,
                  zIndex: isCenter ? 30 : 12 - Math.abs(offset),
                  opacity: isCenter ? 1 : 0.55,
                  rotateY: offset * -8,
                  filter: isCenter ? "blur(0px)" : "blur(0.35px)",
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

      <div
        className="mt-4 flex items-center justify-center gap-2 sm:mt-5"
        role="tablist"
        aria-label="Game modes"
      >
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
                ? "w-7 bg-[var(--gamibar-brand)]"
                : "w-2.5 bg-[var(--gamibar-border)] hover:bg-[var(--muted-foreground)]",
            )}
          />
        ))}
      </div>
    </div>
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
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-[var(--gamibar-surface)] text-left transition-all duration-200",
        selected
          ? cn("border-[var(--foreground)] ring-2 ring-[var(--foreground)]/10", item.glowClass)
          : "border-[var(--gamibar-border)]",
        featured && "shadow-[var(--shadow-lift)]",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]">
        <img
          src={item.preview}
          alt=""
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span
          className={cn(
            "absolute left-3 top-3 grid size-9 place-items-center rounded-xl backdrop-blur-sm sm:size-10",
            item.badgeClass,
          )}
        >
          <Icon className="size-4 sm:size-5" />
        </span>
        {selected && (
          <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] shadow-lg sm:size-8">
            <Check className="size-3.5 sm:size-4" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="font-display text-base font-bold text-[var(--foreground)] sm:text-lg">
          {GAME_MODE_META[item.mode].title}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{item.tagline}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {item.specs.map((spec) => (
            <span
              key={spec}
              className="rounded-full bg-[var(--gamibar-page)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
