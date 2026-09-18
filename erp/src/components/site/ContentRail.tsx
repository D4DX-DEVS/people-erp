import { useRef, type ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

export interface ContentRailItem {
  _id: string;
  title: string;
  imageUrl?: string;
  /** Small label on the left of the meta line — the category. */
  eyebrow?: string;
  /** Small value on the right of the meta line — the date. */
  meta?: string;
  /** Attribution line under the headline. */
  byline?: string;
}

/**
 * Card rail used by both the news and the blog bands, matching the marketing
 * site: a left-aligned display heading with the controls opposite it, then
 * cards carrying a photo, a category/date line, the headline in Anek Malayalam,
 * the attribution and a circular arrow.
 *
 * The rail scrolls one card per arrow press rather than paging a slide, so a
 * wide viewport still moves a single card when the arrows are used. `aside`
 * replaces the arrows with something else — the videos band puts an "Explore
 * More" link there instead.
 */
export function ContentRail({
  heading,
  items,
  onOpen,
  aside,
}: {
  heading: string;
  items: ContentRailItem[];
  onOpen: (id: string) => void;
  aside?: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const nudge = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(":scope > *");
    el.scrollBy({ left: dir * ((first?.offsetWidth || el.clientWidth / 3) + 20), behavior: "smooth" });
  };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <h2 className="max-w-[19ch] text-[28px] sm:text-[34px] lg:text-[38px]">{heading}</h2>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {aside ?? (
            <>
              <button
                type="button"
                onClick={() => nudge(-1)}
                aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => nudge(1)}
                aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={trackRef} className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
        {items.map((item) => (
          <article
            key={item._id}
            className="w-[82%] shrink-0 snap-start sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
          >
            <button
              type="button"
              onClick={() => onOpen(item._id)}
              className="group flex h-full w-full flex-col rounded-[20px] border border-border/70 bg-card p-3 text-left shadow-sm transition-shadow duration-300 hover:shadow-lg"
            >
              <span className="block overflow-hidden rounded-[14px] bg-muted">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="block aspect-[3/2] w-full bg-gradient-hero" />
                )}
              </span>

              <span className="flex flex-1 flex-col px-1 pb-1 pt-4">
                {(item.eyebrow || item.meta) && (
                  <span className="flex items-baseline justify-between gap-3 text-[15px] leading-6 text-muted-foreground">
                    <span className="capitalize">{item.eyebrow}</span>
                    <span className="shrink-0">{item.meta}</span>
                  </span>
                )}
                <span className="mt-2 font-malayalam text-[19px] leading-[1.2] text-foreground sm:text-[20px]">
                  {item.title}
                </span>
                {item.byline && (
                  <span className="mt-3 text-[15px] leading-6 text-muted-foreground">{item.byline}</span>
                )}

                <span className="mt-auto flex justify-end pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </span>
              </span>
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
