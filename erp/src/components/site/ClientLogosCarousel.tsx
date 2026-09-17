import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClientLogo {
  name: string;
  src: string;
  href?: string;
}

/** Marquee speed, in CSS pixels per second. */
const SCROLL_SPEED = 38;

/**
 * Logo strip that drifts continuously from right to left.
 *
 * Four logos are visible on desktop and two on mobile, so each item is sized as
 * an exact fraction of the track (w-1/2 / w-1/4). Spacing lives in each item's
 * padding rather than a flex `gap`, because a gap would make the items narrower
 * than that fraction and the arrows' one-logo step would drift out of alignment.
 *
 * The list is rendered twice to loop seamlessly: once the track has scrolled
 * past the first copy, scrollLeft is rewound by exactly that copy's width. The
 * content at the two positions is identical, so the jump is invisible — which a
 * plain "scroll back to zero" would not be.
 *
 * The drift runs off requestAnimationFrame against the same scrollLeft the
 * arrows drive, rather than a CSS transform: one source of truth means the
 * arrows, the rewind and the motion cannot disagree about where the track is.
 */
export function ClientLogosCarousel({ logos }: { logos: ClientLogo[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);

  const itemWidth = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector("li");
    return first ? first.getBoundingClientRect().width : el.clientWidth / 4;
  }, []);

  const step = useCallback((dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const width = itemWidth();
    // The content repeats every `logos.length` items. Derived from the item
    // width rather than scrollWidth/2 so any padding on the track cannot throw
    // the rewind out of alignment.
    const period = width * logos.length;
    if (period <= 0) return;

    // Rewind by one full copy before stepping past the end (or before stepping
    // backwards off the start), so there is always somewhere to move to.
    if (dir > 0 && el.scrollLeft >= period - 1) el.scrollLeft -= period;
    else if (dir < 0 && el.scrollLeft <= 1) el.scrollLeft += period;

    el.scrollBy({ left: width * dir, behavior: "smooth" });
  }, [itemWidth, logos.length]);

  useEffect(() => {
    if (paused || logos.length === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = trackRef.current;
    if (!el) return;

    // Measured once rather than per frame: itemWidth() reads layout, and doing
    // that on every tick alongside the scrollLeft write is a forced reflow each
    // frame. The item width only changes when the breakpoint does, so a resize
    // listener is enough to keep it honest.
    let period = itemWidth() * logos.length;
    const remeasure = () => { period = itemWidth() * logos.length; };
    window.addEventListener("resize", remeasure);

    // The position is accumulated here as a float and only then written out.
    // Reading scrollLeft back each frame instead loses the motion entirely:
    // one frame's worth at this speed is well under a pixel, and the browser
    // snaps scrollLeft to whole device pixels, so `+=` would round the
    // increment away and the strip would crawl at a fraction of SCROLL_SPEED.
    let position = el.scrollLeft;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      // Advance by elapsed time, not a fixed amount per frame, so the strip
      // moves at the same speed on a 120Hz screen as on a 60Hz one.
      const elapsed = (now - previous) / 1000;
      previous = now;
      if (period > 0) {
        position += SCROLL_SPEED * elapsed;
        if (position >= period) position -= period;
        el.scrollLeft = position;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
    };
  }, [paused, logos.length, itemWidth]);

  if (logos.length === 0) return null;

  const arrow =
    "absolute top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 " +
    "bg-background/90 p-2 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-muted hover:text-foreground sm:flex";

  const renderItem = (logo: ClientLogo, i: number, duplicate = false) => {
    const img = (
      <img
        src={logo.src}
        alt={duplicate ? "" : logo.name}
        loading="lazy"
        decoding="async"
        className="mx-auto h-12 w-auto max-w-full object-contain transition-transform duration-300 hover:scale-105 sm:h-16"
      />
    );
    return (
      <li
        key={`${logo.name}-${i}${duplicate ? "-dup" : ""}`}
        // Exactly two per view on mobile, four from sm up.
        className="w-1/2 shrink-0 px-5 sm:w-1/4 sm:px-8"
        aria-hidden={duplicate || undefined}
      >
        {logo.href ? (
          <a
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer"
            title={logo.name}
            className="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            tabIndex={duplicate ? -1 : undefined}
          >
            {img}
          </a>
        ) : (
          img
        )}
      </li>
    );
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous logos"
        className={cn(arrow, "left-2 md:left-6")}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <ul
        ref={trackRef}
        // scroll-behavior must be auto here, and the .scrollbar-hide utility
        // sets it to smooth — hence the inline override, which no class can
        // lose a specificity race to. Under smooth, every scrollLeft write
        // becomes an animation that reads back as the *old* value, so the
        // per-frame drift above cancels itself and the strip never moves; the
        // arrows' rewind-by-one-copy would animate rather than jump, too.
        // The arrows still glide: scrollBy's explicit behavior wins over this.
        style={{ scrollBehavior: "auto" }}
        className="scrollbar-hide flex items-center overflow-x-auto py-2"
      >
        {logos.map((logo, i) => renderItem(logo, i))}
        {logos.map((logo, i) => renderItem(logo, i, true))}
      </ul>

      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next logos"
        className={cn(arrow, "right-2 md:right-6")}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
