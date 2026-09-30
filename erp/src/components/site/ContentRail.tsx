import { useRef, type ReactNode } from "react";
import { SectionHeading } from "@/components/site/SectionHeading";
import type { HomeHeadingStyle } from "@/types/siteHome";
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
  /** Short summary shown under the byline, clamped to a few lines. */
  excerpt?: string;
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
  headingColors,
  items,
  onOpen,
  aside,
}: {
  heading: string;
  /** Admin-chosen heading colour; unset keeps the page's default text colour. */
  headingColors?: HomeHeadingStyle;
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
      <div className="relative">
      <SectionHeading title={heading} colors={headingColors} />
      <div className="absolute right-0 top-0 flex items-start justify-end gap-4">
        <div className="flex shrink-0 items-center gap-2">
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
      </div>

      {/* items-start: cards size to their own content instead of the default
          flex stretch, which matched every card's height to the tallest one
          in the whole scrollable row — a card with a short title/excerpt
          stretched to a longer sibling's height left a dead gap below its
          "Read more" row with nothing to fill it. */}
      <div ref={trackRef} className="scrollbar-hide flex snap-x snap-mandatory items-start gap-5 overflow-x-auto pb-2">
        {items.map((item) => (
          <article
            key={item._id}
            className="w-[82%] shrink-0 snap-start sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
          >
            <button
              type="button"
              onClick={() => onOpen(item._id)}
              className="group flex w-full flex-col rounded-[20px] border border-border/70 bg-card p-3 pb-2.5 text-left shadow-sm transition-shadow duration-300 hover:shadow-lg"
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

              <span className="flex flex-col px-1 pt-2.5">
                {/* Category and author are dropped from the card front — the
                    date is the only thing readers need at a glance here. */}
                {item.meta && <span className="text-[15px] leading-6 text-muted-foreground">{item.meta}</span>}
                <span className="mt-1.5 font-malayalam text-[19px] leading-[1.2] text-foreground sm:text-[20px]">
                  {item.title}
                </span>
                {item.excerpt && (
                  <span className="mt-1.5 line-clamp-2 font-noto-malayalam text-[16px] leading-relaxed text-muted-foreground">
                    {item.excerpt}
                  </span>
                )}

                <span className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary transition-colors duration-300 group-hover:underline">
                    Read more
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
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
