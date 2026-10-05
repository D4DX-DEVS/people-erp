import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorValue, colorTint } from "@/lib/siteColors";
import type { SectionItem } from "@/types/sitePage";

/** Width of one milestone column. Wide enough for a short paragraph without a tall card. */
const COLUMN = "w-60 sm:w-72";
/** Centre of the 1rem marker dot, measured from the left edge of the marker row. */
const DOT_CENTRE = "0.5rem";

/**
 * A timeline laid out left to right: the year above, a dot on a continuous
 * rule, the milestone's title and text below.
 *
 * The strip scrolls on its own axis, so the page never moves sideways — swipe
 * or trackpad on touch and laptops, the arrow buttons for a mouse, Tab then
 * ← / → for the keyboard. Columns snap to the left edge so a scroll never
 * leaves a milestone cut in half, and the arrows only appear when there is
 * somewhere to go.
 *
 * `onDark` switches the rule, dots, arrows and text to white. A section with
 * a dark custom colour is also covered by PageSections' own `[&_h3]`/`[&_p]`
 * overrides, which is why the text stays <h3>/<p>.
 */
export function HorizontalTimeline({
  items, accent, onDark,
}: {
  items: SectionItem[];
  accent?: string;
  /** The section sits on a dark band: draw the rule and dots in white. */
  onDark?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    // A pixel of slack: fractional scroll positions never quite reach the end.
    setEdge({
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  const scrollBy = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 240), behavior: reduced ? "auto" : "smooth" });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") { event.preventDefault(); scrollBy(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); scrollBy(-1); }
  };

  const overflowing = !(edge.atStart && edge.atEnd);
  const ruleColor = onDark ? "rgba(255,255,255,0.4)" : colorTint(accent, 0.35);
  const dotColor = onDark ? "#ffffff" : colorValue(accent);

  // Soften the edges that have more content past them, so it is clear the strip scrolls.
  const fade = (side: "left" | "right") => (side === "left" ? !edge.atStart : !edge.atEnd);
  const mask = overflowing
    ? `linear-gradient(to right, ${fade("left") ? "transparent, #000 2.5rem" : "#000, #000"}, ${fade("right") ? "#000 calc(100% - 2.5rem), transparent" : "#000, #000"})`
    : undefined;

  return (
    <div className="relative">
      <div
        ref={scroller}
        role="region"
        aria-label="Timeline — scroll sideways for more"
        tabIndex={0}
        onScroll={measure}
        onKeyDown={onKeyDown}
        className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-2 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 [&::-webkit-scrollbar]:hidden"
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      >
        {/* min-w-full + w-max: a short timeline fills the row, a long one grows
            past it and scrolls. */}
        <ol className="flex w-max min-w-full">
          {items.map((item, idx) => {
            const first = idx === 0;
            const last = idx === items.length - 1;
            const label = item.value || item.subtitle;
            return (
              <li key={item._id || idx} className={cn("shrink-0 snap-start px-4", COLUMN)}>
                <div className="h-6 text-sm font-bold" style={{ color: dotColor }}>{label}</div>

                {/* The rule runs through every column, so it reads as one line:
                    the first column starts it at its dot and the last ends it there. */}
                <div className="relative my-2 h-4">
                  {items.length > 1 && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 h-0.5 -translate-y-1/2"
                      style={{
                        backgroundColor: ruleColor,
                        left: first ? DOT_CENTRE : "-1rem",
                        right: last ? `calc(100% - ${DOT_CENTRE})` : "-1rem",
                      }}
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-4 w-4 rounded-full border-2 bg-background"
                    style={{ borderColor: dotColor }}
                  />
                </div>

                {item.title && <h3 className={cn("mt-3 font-semibold", onDark && "text-white")}>{item.title}</h3>}
                {item.description && (
                  <p className={cn("mt-1 text-sm", onDark ? "text-white/85" : "text-muted-foreground")}>{item.description}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {overflowing && (
        <div className="mt-3 flex justify-end gap-2">
          {([-1, 1] as const).map((direction) => {
            const disabled = direction === -1 ? edge.atStart : edge.atEnd;
            const Icon = direction === -1 ? ChevronLeft : ChevronRight;
            return (
              <button
                key={direction}
                type="button"
                disabled={disabled}
                onClick={() => scrollBy(direction)}
                aria-label={direction === -1 ? "Scroll timeline left" : "Scroll timeline right"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition disabled:cursor-default disabled:opacity-35",
                  onDark ? "border-white/50 text-white hover:bg-white/15" : "border-border bg-background text-foreground/70 hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
