import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HomeProductCarouselProps {
  children: ReactNode;
  className?: string;
}

export function HomeProductCarousel({ children, className = '' }: HomeProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(maxScroll > 8 && el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, children]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const showArrows = canScrollLeft || canScrollRight;

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="Previous items"
          className={`absolute left-0 top-[42%] -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-gs-border bg-gs-surface shadow-lg flex items-center justify-center text-gs-muted hover:text-gs-text hover:border-gs-accent/40 transition-all -translate-x-1/2 ${showArrows ? 'opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Next items"
          className={`absolute right-0 top-[42%] -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-gs-border bg-gs-surface shadow-lg flex items-center justify-center text-gs-muted hover:text-gs-text hover:border-gs-accent/40 transition-all translate-x-1/2 ${showArrows ? 'opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Standard product card width for home catalog rows */
export const CAROUSEL_ITEM_CLASS = 'shrink-0 snap-start w-44 sm:w-48 lg:w-52';

/** Wider cards for subscription banners */
export const CAROUSEL_SUB_ITEM_CLASS = 'shrink-0 snap-start w-[85vw] sm:w-80 lg:w-[22rem]';
