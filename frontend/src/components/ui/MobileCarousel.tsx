import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MobileCarouselProps {
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  showIndicators?: boolean;
}

export function MobileCarousel({
  children,
  className,
  itemClassName,
  showIndicators = true,
}: MobileCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(children.length > 1);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const itemWidth = el.clientWidth;

    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < maxScroll - 10);

    const index = Math.round(scrollLeft / (itemWidth || 1));
    setActiveIndex(Math.min(Math.max(index, 0), children.length - 1));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [children.length]);

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const targetLeft = index * el.clientWidth;
    el.scrollTo({ left: targetLeft, behavior: "smooth" });
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < children.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex w-full snap-x snap-mandatory overflow-x-auto pb-1 pt-1 no-scrollbar [-webkit-overflow-scrolling:touch]"
      >
        {React.Children.map(children, (child, idx) => (
          <div
            key={idx}
            className={cn(
              "w-full min-w-full shrink-0 snap-center",
              itemClassName,
            )}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Navigation Controls on Mobile */}
      <div className="mt-2.5 flex items-center justify-between px-1">
        {/* Pagination Dots */}
        {showIndicators && (
          <div className="flex items-center gap-1.5">
            {children.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeIndex === idx
                    ? "w-5 bg-[#FF3B30]"
                    : "w-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]",
                )}
              />
            ))}
          </div>
        )}

        {/* Arrow Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canScrollLeft}
            aria-label="Previous slide"
            className={cn(
              "grid size-7 place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#111111] shadow-sm transition-opacity active:scale-95",
              !canScrollLeft && "opacity-30 pointer-events-none",
            )}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canScrollRight}
            aria-label="Next slide"
            className={cn(
              "grid size-7 place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#111111] shadow-sm transition-opacity active:scale-95",
              !canScrollRight && "opacity-30 pointer-events-none",
            )}
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
