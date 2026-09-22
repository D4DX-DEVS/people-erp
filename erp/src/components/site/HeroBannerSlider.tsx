import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeroBanner {
  _id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  link?: string;
}

interface HeroBannerSliderProps {
  banners: HeroBanner[];
  hero?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
  };
}

const AUTOPLAY_MS = 6000;

/**
 * Photo hero: one slide per banner the franchise has uploaded, with that
 * banner's own title, text and link over it.
 *
 * Everything here comes from the franchise's Banners (Website → Banners), which
 * are franchise-scoped in the database — so two franchises on the same
 * deployment run entirely different hero content, and neither is baked into the
 * bundle the way the illustrated hero's artwork is.
 */
export function HeroBannerSlider({ banners, hero }: HeroBannerSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const multiple = count > 1;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  // A slider that moves on its own is a motion source like any other, so it
  // holds still for anyone who has asked the OS for reduced motion.
  const reducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { reducedMotion.current = e.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!multiple || paused || reducedMotion.current) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [multiple, paused, count]);

  // An admin can delete a banner while the page is open; without this the
  // index can sit past the end of the list and the band renders empty.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  const open = (link?: string) => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.open(link, "_blank", "noopener");
    else window.location.assign(link);
  };

  if (!count) return null;

  return (
    <section
      className="relative isolate overflow-hidden bg-muted"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Fills the pinned .site-hero frame (100svh on desktop): the image
          keeps its shape via object-cover, so the headline never lands on a
          face. Outside the pinned hero (e.g. mobile fallback, or reuse
          elsewhere) it keeps a sensible band height via min/max. */}
      <div className="relative h-full min-h-[20rem] w-full max-h-[34rem] [.site-hero_&]:max-h-none">
        {banners.map((banner, i) => {
          const active = i === index;
          return (
            <div
              key={banner._id || i}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              <img
                src={banner.imageUrl}
                alt={banner.title || ""}
                className="h-full w-full object-cover object-center"
                loading={i === 0 ? "eager" : "lazy"}
              />
              {/* Scrim: banners are arbitrary photographs, so the copy needs a
                  guaranteed ground rather than hoping the upload is dark
                  enough on the side the text sits. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent"
              />
            </div>
          );
        })}

        {/* Copy. Keyed on the index so each slide's text animates in. */}
        <div className="absolute inset-0">
          <div className="container mx-auto flex h-full max-w-6xl items-center px-4">
            <div key={index} className="max-w-xl space-y-4 text-white">
              {(banners[index]?.title || hero?.title) && (
                <h1 className="animate-in fade-in slide-in-from-bottom-4 break-words text-3xl font-extrabold leading-tight drop-shadow-sm duration-700 sm:text-4xl md:text-5xl">
                  {banners[index]?.title || hero?.title}
                </h1>
              )}
              {(banners[index]?.description || hero?.subtitle) && (
                <p className="animate-in fade-in slide-in-from-bottom-4 max-w-lg text-sm leading-relaxed text-white/85 duration-700 sm:text-base md:text-lg">
                  {banners[index]?.description || hero?.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                {(banners[index]?.link || hero?.ctaLink) && (
                  <Button
                    size="lg"
                    className="rounded-full bg-[hsl(var(--warning))] px-6 text-white shadow-glow hover:bg-[hsl(var(--warning))]/90"
                    onClick={() => open(banners[index]?.link || hero?.ctaLink)}
                  >
                    <span className="truncate">{hero?.ctaText || "Know more"}</span>
                    <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                )}
                {hero?.secondaryCtaText && hero?.secondaryCtaLink && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/70 bg-white/10 px-6 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                    onClick={() => open(hero.secondaryCtaLink)}
                  >
                    <span className="truncate">{hero.secondaryCtaText}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {multiple && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-foreground/80 shadow-md transition hover:bg-white sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-foreground/80 shadow-md transition hover:bg-white sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
