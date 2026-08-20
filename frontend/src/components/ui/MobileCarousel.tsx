import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MobileCarouselProps {
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  showIndicators?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function MobileCarousel({
  children,
  className,
  itemClassName,
  showIndicators = true,
  autoPlay = true,
  autoPlayInterval = 4000,
}: MobileCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(children.length > 1);
  const [isPaused, setIsPaused] = useState(false);
  const totalItems = React.Children.count(children);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const itemWidth = el.clientWidth;

    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < maxScroll - 10);

    const index = Math.round(scrollLeft / (itemWidth || 1));
    setActiveIndex(Math.min(Math.max(index, 0), totalItems - 1));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [totalItems]);

  // Autoplay functionality
  useEffect(() => {
    if (!autoPlay || isPaused || totalItems <= 1) return;

    const timer = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;

      const nextIndex = (activeIndex + 1) % totalItems;
      const targetLeft = nextIndex * el.clientWidth;
      el.scrollTo({ left: targetLeft, behavior: "smooth" });
      setActiveIndex(nextIndex);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, activeIndex, totalItems, autoPlayInterval]);

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const targetLeft = index * el.clientWidth;
    el.scrollTo({ left: targetLeft, behavior: "smooth" });
    setActiveIndex(index);
  };

  const handlePrev = () => {
    const prevIndex = activeIndex > 0 ? activeIndex - 1 : totalItems - 1;
    scrollToIndex(prevIndex);
  };

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % totalItems;
    scrollToIndex(nextIndex);
  };

  return (
    <div
      className={cn("relative w-full", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // Resume after 3s of touch release
        setTimeout(() => setIsPaused(false), 3000);
      }}
    >
      {/* Scrollable Container with Hidden Scrollbars */}
      <div
        ref={scrollRef}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="flex w-full snap-x snap-mandatory overflow-x-auto pb-1 pt-1 no-scrollbar [-webkit-overflow-scrolling:touch]"
      >
        {React.Children.map(children, (child, idx) => (
          <div
            key={idx}
            className={cn(
              "w-full min-w-full shrink-0 snap-center px-0.5",
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
                    : "w-1.5 bg-[#9CA3AF] hover:bg-[#6B7280]",
                )}
              />
            ))}
          </div>
        )}

        {/* Arrow Buttons with Darker Crisp Borders */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            className="grid size-7 place-items-center rounded-full border border-[#9CA3AF] bg-white text-[#111111] shadow-sm transition-all hover:border-[#111111] hover:bg-[#F3F4F6] active:scale-95"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            className="grid size-7 place-items-center rounded-full border border-[#9CA3AF] bg-white text-[#111111] shadow-sm transition-all hover:border-[#111111] hover:bg-[#F3F4F6] active:scale-95"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
