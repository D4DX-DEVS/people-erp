import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { schemeTheme } from "@/config/schemeThemes";
import { resolveIcon } from "@/lib/siteIcons";
import type { SchemeCardData } from "@/components/site/SchemeCard";
import { CATEGORY_WASH, NEUTRAL_WASH } from "@/components/site/ProjectsGrid";

gsap.registerPlugin(ScrollTrigger);

/** How many schemes sit in the stack; the hub page carries the full list. */
const STACK_SIZE = 5;

/**
 * "Schemes & Programs" as a GSAP ScrollTrigger stack: the section pins for
 * (cards − 1) viewports while a scrubbed timeline slides each scheme up over
 * the previous one — one sitting inside another, revealed one by one as the
 * site scrolls. The covered card settles back slightly and dims, so the
 * incoming scheme reads as landing on top.
 *
 * Below `lg`, or for reduced-motion users, ScrollTrigger never engages and
 * the same markup falls back to a plain vertical list (GSAP only ever writes
 * inline styles inside the matchMedia block, and ctx.revert() removes them).
 */
export function SchemesStack({
  schemes,
  onOpen,
  onViewAll,
}: {
  schemes: SchemeCardData[];
  onOpen: (scheme: SchemeCardData) => void;
  onViewAll: () => void;
}) {
  const visible = schemes.slice(0, STACK_SIZE);
  const scopeRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const pin = pinRef.current;
        const stage = stageRef.current;
        if (!pin || !stage) return;
        const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]", stage);
        if (cards.length < 2) return;

        // The pinned viewport: intro on the left, a full-height stage right.
        gsap.set(pin, { height: "100svh" });
        gsap.set(stage, { position: "relative", display: "block", height: "calc(100svh - 48px)" });
        gsap.set(cards, { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" });
        gsap.set(cards[0], { yPercent: 0 });

        // One timeline step per handover; scrubbed across a pin long enough
        // for every card to take its turn up front.
        const step = 0.5;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: () => `+=${(cards.length - 1) * window.innerHeight}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        cards.forEach((card, i) => {
          if (i === 0) return;
          const at = (i - 1) * step;
          tl.fromTo(card, { yPercent: 100 }, { yPercent: 0, duration: step }, at);
          tl.to(
            cards[i - 1],
            {
              scale: 0.92,
              filter: "brightness(0.85)",
              transformOrigin: "center top",
              duration: step,
            },
            at,
          );
        });
      });
    }, scopeRef);
    return () => ctx.revert();
  }, [schemes]);

  return (
    <div ref={scopeRef}>
      <div ref={pinRef} className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        {/* Intro — holds still in the pinned viewport while cards hand over. */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Support Programs
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
            Schemes & <span className="text-primary">Programs</span>
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Focused initiatives for a stronger, self-reliant community. Scroll to walk through
            each program — every card carries its own story.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full px-8" onClick={onViewAll}>
              View all schemes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <a href="#donate">Donate Now</a>
            </Button>
          </div>
        </div>

        {/* The stack stage: flow list by default, GSAP-absolute cards on lg. */}
        <div ref={stageRef} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-8">
            {visible.map((sc, i) => (
              <SchemeStackCard key={sc._id} scheme={sc} index={i} onOpen={() => onOpen(sc)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SchemeStackCard({
  scheme,
  index,
  onOpen,
}: {
  scheme: SchemeCardData;
  index: number;
  onOpen: () => void;
}) {
  const theme = schemeTheme(scheme.category);
  const Icon = resolveIcon(theme.icon);
  const wash = CATEGORY_WASH[scheme.category || "other"] || NEUTRAL_WASH;
  const name = scheme.name || scheme.title || "Scheme";
  const artwork = scheme.imageUrl || theme.image;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = artwork && !failed;

  return (
    <article
      data-stack-card
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={name}
      style={{ background: wash.tint }}
      className="group flex cursor-pointer flex-col rounded-[1.75rem] bg-card p-5 shadow-xl transition-shadow duration-300 hover:shadow-2xl sm:p-6"
    >
      {/* Number + title + text, like the reference header row. */}
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-snug text-foreground">{name}</h3>
          {scheme.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground/70">
              {scheme.description}
            </p>
          )}
        </div>
      </div>

      {/* Media panel: white inner card with a label row and the photo. */}
      <div className="mt-4 flex flex-1 flex-col rounded-2xl bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-1 pb-2.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {scheme.category ? scheme.category.replace(/_/g, " ") : "Scheme"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
            Learn more <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
        <div
          className="relative aspect-video min-h-60 flex-1 overflow-hidden rounded-xl"
          style={{ background: wash.tint }}
        >
          {showImage ? (
            <img
              src={artwork}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03]",
                loaded ? "opacity-100" : "opacity-0",
              )}
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center opacity-50" style={{ color: wash.accent }}>
              <Icon className="h-14 w-14" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
