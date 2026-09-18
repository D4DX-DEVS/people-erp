import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOrgLogoUrl } from "@/hooks/useOrgLogoUrl";

export interface CampaignSlide {
  _id: string;
  /** The large display line. Wraps to two or three lines by design. */
  headline: string;
  /** Small line above the detail — the programme or category. */
  kicker?: string;
  detail?: string;
  imageUrl?: string;
  href: string;
}

const ADVANCE_MS = 7000;

/**
 * Campaign carousel, matching the marketing site's opening band: a large
 * display headline with the organisation's mark beside it, a wide campaign
 * tile with the corner notch, and the site's red "Click here" call to action
 * riding under it.
 *
 * Slides advance on a timer and stop the moment the pointer or keyboard is
 * inside the band, so nothing shifts while it is being read. Reduced motion
 * disables the timer and the slide transition; the arrows still work.
 */
export function CampaignCarousel({
  slides,
  onOpen,
  ctaLabel = "Click here",
}: {
  slides: CampaignSlide[];
  onOpen: (href: string) => void;
  ctaLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [holding, setHolding] = useState(false);
  const logoUrl = useOrgLogoUrl();
  const count = slides.length;

  useEffect(() => {
    if (holding || count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [holding, count]);

  if (count === 0) return null;
  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocusCapture={() => setHolding(true)}
      onBlurCapture={() => setHolding(false)}
      aria-roledescription="carousel"
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s) => (
          <article key={s._id} className="w-full shrink-0" aria-hidden={slides[index]?._id !== s._id}>
            <div className="flex items-start justify-between gap-6">
              <h2 className="max-w-[15ch] text-[32px] leading-[0.95] sm:text-[42px] lg:text-[55px] lg:leading-[0.9]">
                {s.headline}
              </h2>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className="mt-1 hidden h-14 w-auto shrink-0 object-contain sm:block lg:h-20"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpen(s.href)}
              className="campaign-tile mt-6 block w-full overflow-hidden bg-muted text-left shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span className="relative block aspect-[16/9] w-full sm:aspect-[2/1]">
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="block h-full w-full bg-gradient-hero" />
                )}
                {(s.kicker || s.detail) && (
                  <>
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 block p-5 sm:p-7">
                      {s.kicker && (
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                          {s.kicker}
                        </span>
                      )}
                      {s.detail && (
                        <span className="mt-1 block max-w-xl text-base font-medium leading-snug text-white sm:text-lg">
                          {s.detail}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </span>
            </button>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => onOpen(s.href)}
                className="campaign-cta rounded-xl px-6 py-3 text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {ctaLabel}
              </button>
            </div>
          </article>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous campaign"
            className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:border-primary hover:text-primary sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next campaign"
            className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:border-primary hover:text-primary sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
