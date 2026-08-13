import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState, type ReactNode } from "react";

import { MOTION_EASE } from "@/components/ui/text-motion";
import { cn } from "@/lib/utils";

type SectionCarouselProps = {
  items: ReactNode[];
  ariaLabel: string;
  className?: string;
  showArrows?: boolean;
};

export function SectionCarousel({
  items,
  ariaLabel,
  className,
  showArrows = true,
}: SectionCarouselProps) {
  const [active, setActive] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const count = items.length;

  const goNext = useCallback(() => setActive((i) => (i + 1) % count), [count]);
  const goPrev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);

  if (count === 0) return null;

  return (
    <div className={cn("section-carousel flex min-h-0 flex-1 flex-col", className)}>
      <div
        className="section-carousel__viewport relative min-h-0 flex-1 px-10 sm:px-12"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return;
          const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          if (delta > 48) goPrev();
          else if (delta < -48) goNext();
          setTouchStartX(null);
        }}
      >
        {showArrows && count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="absolute left-0 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] sm:size-10"
            >
              <ChevronLeft className="size-4 sm:size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="absolute right-0 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] sm:size-10"
            >
              <ChevronRight className="size-4 sm:size-5" />
            </button>
          </>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: MOTION_EASE }}
            className="flex h-full min-h-0 items-center justify-center"
          >
            <div className="w-full max-w-md">{items[active]}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="mt-3 flex shrink-0 items-center justify-center sm:mt-4" role="tablist">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActive(index)}
              className="grid size-6 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <span
                aria-hidden
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === active
                    ? "w-6 bg-[var(--gamibar-brand)]"
                    : "w-2 bg-[var(--gamibar-border)]",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
