import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroMontage from "@/assets/bnr1.png";
import { HeroBannerSlider } from "@/components/site/HeroBannerSlider";
import { usePointerParallax } from "@/hooks/useParallax";

interface Banner {
  _id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  link?: string;
}

interface HeroSliderProps {
  banners: Banner[];
  hero?: {
    /** Which hero this franchise runs — set under Website Settings → Hero. */
    style?: "illustrated" | "slider";
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
  };
}

interface SlideContent {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
}

const SLIDES: SlideContent[] = [
  {
    eyebrow: "Helping Them Today",
    titleLine1: "Zakat",
    titleLine2: "Brings Smile",
    subtitle: "Your Zakat can bring hope, dignity and a better tomorrow for families across Kerala.",
  },
  {
    eyebrow: "Empowering Through Zakat",
    titleLine1: "Transforming",
    titleLine2: "Lives Together",
    subtitle: "From housing to healthcare, your Zakat reaches families across Kerala who need it most.",
  },
  {
    eyebrow: "A Just & Compassionate Society",
    titleLine1: "Standing",
    titleLine2: "Together",
    subtitle: "Join thousands of donors and volunteers building dignity, hope and self-reliance across Kerala.",
  },
];

/**
 * Takes SHOUTY text down to Title Case, one capital per word.
 *
 * Applied per line and only when that line has no lowercase letter at all, so
 * "BAITHUZZAKATH KERALA" becomes "Baithuzzakath Kerala" while an already
 * mixed-case line is returned untouched. Capitalising per word rather than per
 * line matters for names: sentence case would give "Baithuzzakath kerala".
 */
function sentenceCase(text: string): string {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(/(^|[\s([/-])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

/**
 * Splits an admin-supplied title into the two-line green/orange shape.
 *
 * An explicit separator wins — a newline, a colon or a pipe is where the author
 * meant the line to break ("Baithuzzakath Kerala: Revitalizing Lives"). Only
 * when there is none do we fall back to the built-in slides' shape of first
 * word, then the remainder.
 */
function splitTitle(text: string): { line1: string; line2: string } {
  const raw = text.trim();
  const match = raw.match(/^([^\n:|]+)[\n:|]\s*([\s\S]+)$/);
  if (match) {
    return { line1: sentenceCase(match[1].trim()), line2: sentenceCase(match[2].trim()) };
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { line1: sentenceCase(words[0] || ""), line2: "" };
  return { line1: sentenceCase(words[0]), line2: sentenceCase(words.slice(1).join(" ")) };
}

/** Simple palm silhouette, mirrored for the right edge. */
function PalmSilhouette({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 160" fill="currentColor"
      className={flip ? "scale-x-[-1]" : ""}
      style={{ width: "100%", height: "100%" }}
    >
      <path d="M58 160 L64 70 L70 160 Z" />
      <path d="M62 70 C 40 55, 20 55, 6 40 C 24 44, 42 48, 60 62 Z" />
      <path d="M64 70 C 50 45, 40 28, 44 8 C 54 24, 60 46, 66 68 Z" />
      <path d="M66 68 C 78 44, 96 30, 118 26 C 100 40, 84 52, 68 66 Z" />
      <path d="M64 66 C 60 40, 64 20, 80 4 C 78 24, 72 44, 68 66 Z" />
      <path d="M62 66 C 46 50, 26 44, 4 46 C 22 54, 40 60, 60 68 Z" />
    </svg>
  );
}

/**
 * The home page's opening band.
 *
 * Two shapes, chosen per franchise by Website Settings → Hero:
 *  - "slider"      — the franchise's uploaded banners as a photo slider.
 *  - "illustrated" — the built-in artwork hero below (the default).
 *
 * A franchise that asks for the slider before uploading any banner still gets
 * the illustrated hero, so the page never opens on an empty band.
 */
export function HeroSlider({ banners, hero }: HeroSliderProps) {
  if (hero?.style === "slider" && banners.length > 0) {
    return <HeroBannerSlider banners={banners} hero={hero} />;
  }
  return <IllustratedHero banners={banners} hero={hero} />;
}

function IllustratedHero({ banners, hero }: HeroSliderProps) {
  // Publishes the pointer position onto the band; the layers below read it back
  // through their own `--depth` (see .hero-layer in index.css).
  const heroRef = usePointerParallax<HTMLElement>();
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;
  const active = banners[index % (banners.length || 1)];
  const slide = SLIDES[index];

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  const open = (link?: string) => {
    if (!link) return;
    if (link.startsWith("http")) window.open(link, "_blank");
    else window.location.assign(link);
  };

  const customTitle = index === 0 ? (hero?.title || active?.title) : undefined;
  const customSubtitle = index === 0 ? (hero?.subtitle || active?.description) : undefined;

  // A CMS title is split into the same two lines the built-in slides use; the
  // built-in ones only need their casing normalised.
  const title = customTitle
    ? splitTitle(customTitle)
    : { line1: sentenceCase(slide.titleLine1), line2: sentenceCase(slide.titleLine2) };

  return (
    <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-muted via-background to-muted py-6 sm:py-10 md:py-14">
      {/* Subtle Islamic geometric dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.12) 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Decorative dot grid, top right */}
      <div
        className="hero-layer pointer-events-none absolute right-6 top-6 hidden h-24 w-24 opacity-40 md:block"
        style={{ "--depth": 34 } as CSSProperties}
      >
        <div
          className="drift-mark h-full w-full"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--warning)) 1.5px, transparent 1.5px)",
            backgroundSize: "10px 10px",
          }}
        />
      </div>
      {/* Faint mosque silhouette, centered */}
      {/* The centring translate lives on the svg, not on the parallax wrapper:
          a Tailwind `-translate-x-1/2` and .hero-layer's own transform would
          otherwise fight over the same property. */}
      <div
        className="hero-layer pointer-events-none absolute bottom-0 left-1/2 hidden md:block"
        style={{ "--depth": 26 } as CSSProperties}
      >
        <svg
          viewBox="0 0 400 200"
          className="drift-mark h-40 w-auto -translate-x-1/2 text-primary/[0.06]"
          style={{ "--drift-delay": "-1.7s" } as CSSProperties}
          fill="currentColor"
        >
          <rect x="60" y="120" width="280" height="80" />
          <path d="M60 120 Q 200 20 340 120 Z" />
          <rect x="190" y="0" width="20" height="60" />
          <circle cx="200" cy="0" r="12" />
          <rect x="30" y="90" width="16" height="110" />
          <circle cx="38" cy="80" r="10" />
          <rect x="354" y="90" width="16" height="110" />
          <circle cx="362" cy="80" r="10" />
        </svg>
      </div>
      {/* Palm trees, bottom corners. Desktop only: below lg the montage fills
          the band as a backdrop, and the palms only muddied it. */}
      <div
        className="hero-layer pointer-events-none absolute bottom-0 left-0 hidden h-32 w-24 text-primary/10 lg:block lg:h-40 lg:w-32"
        style={{ "--depth": 20, "--drift-delay": "-3.4s" } as CSSProperties}
      >
        <div className="drift-mark h-full w-full">
          <PalmSilhouette />
        </div>
      </div>
      <div
        /* A negative depth: this corner drifts against the pointer, which is
           what separates the two sides into near/far instead of a single plane
           sliding about. */
        className="hero-layer pointer-events-none absolute bottom-0 right-0 hidden h-32 w-24 text-primary/10 lg:block lg:h-40 lg:w-32"
        style={{ "--depth": -16, "--drift-delay": "-2.6s" } as CSSProperties}
      >
        <div className="drift-mark h-full w-full">
          <PalmSilhouette flip />
        </div>
      </div>

      {/* Edge navigation arrows */}
      <div className="absolute inset-y-0 left-3 z-20 hidden items-center lg:flex">
        <button
          onClick={() => go(-1)}
          aria-label="Previous slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground/70 shadow-md transition hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-3 z-20 hidden items-center lg:flex">
        <button
          onClick={() => go(1)}
          aria-label="Next slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground/70 shadow-md transition hover:bg-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* `static` below lg so the montage's absolute positioning resolves
          against the section and the backdrop runs edge to edge; from lg the
          container is the positioning context again and the grid takes over. */}
      <div className="container static mx-auto grid items-center gap-8 px-4 sm:gap-10 lg:relative lg:grid-cols-2 lg:gap-12">
        {/* Text */}
        <div className="relative z-10 max-w-xl space-y-4" key={index}>
          <span className="inline-block animate-in fade-in slide-in-from-bottom-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground duration-700">
            {slide.eyebrow}
          </span>
          {/* One size for every slide, custom or built-in, and the same
              two-tone split: line one green (text-primary), line two orange. */}
          {/* break-words: an admin can put any single long word on either line,
              and at this weight one overflowing word scrolls the whole page. */}
          <h1 className="animate-in fade-in slide-in-from-bottom-4 break-words text-3xl font-extrabold leading-tight text-primary duration-700 sm:text-4xl md:text-6xl">
            {title.line1}
            {title.line2 && (
              <>
                <br />
                <span className="text-[hsl(var(--warning))]">{title.line2}</span>
              </>
            )}
          </h1>
          <p className="animate-in fade-in slide-in-from-bottom-4 text-base text-foreground/75 duration-700 md:text-lg lg:text-muted-foreground">
            {sentenceCase(customSubtitle || slide.subtitle)}
          </p>
          {/* Each button takes half the row on a phone rather than wrapping to
              two stacked full-width pills, then sizes to its label from `sm`. */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              className="min-w-0 flex-1 rounded-full bg-[hsl(var(--warning))] px-4 text-white shadow-glow hover:bg-[hsl(var(--warning))]/90 sm:flex-none sm:px-8"
              onClick={() => open(hero?.ctaLink || active?.link)}
            >
              <span className="truncate">{hero?.ctaText || "Donate Now"}</span>
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-w-0 flex-1 rounded-full px-4 sm:flex-none sm:px-8"
              onClick={() => open(hero?.secondaryCtaLink || "/#calculator")}
            >
              <span className="truncate">{hero?.secondaryCtaText || "Calculate Zakat"}</span>
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex gap-2 lg:hidden">
              <button
                onClick={() => go(-1)}
                aria-label="Previous"
                className="rounded-full border border-border/60 bg-background p-2 text-foreground/70 transition hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next"
                className="rounded-full border border-border/60 bg-background p-2 text-foreground/70 transition hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-2 bg-primary/25"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Decorative community montage — a fixed bundled asset, kept separate
            from admin-uploaded banners (see lib/siteProjects.ts for the same
            convention with project category images). Admin banner text still
            drives the copy on slide 1 when configured; the artwork stays fixed
            so it never breaks on an arbitrary graphic upload.

            Below lg it is the banner itself: pulled out of the flow so the
            headline and CTAs sit on top of it in one column, rather than the
            two stacked blocks that made the hero a screen and a half tall.
            From lg it returns to the flow as the grid's second column. */}
        <div
          className="hero-tilt absolute inset-0 z-0 lg:relative lg:mx-auto lg:flex lg:w-full lg:max-w-2xl lg:items-center lg:justify-center lg:gap-6"
          style={{ "--depth": 18 } as CSSProperties}
        >
          <img
            src={heroMontage}
            alt=""
            className="h-full w-full object-cover object-center lg:h-[26rem] lg:w-auto lg:max-w-full lg:object-contain xl:h-[30rem]"
          />
          {/* Scrim. The montage is a light collage and the headline is the
              brand's dark green, so this lifts contrast without inverting the
              palette to white-on-dark the way a dark overlay would. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-background/88 via-background/70 to-background/88 lg:hidden"
          />
          <div className="hidden shrink-0 self-center lg:block">
            <p className="font-serif text-lg italic leading-snug text-primary/70">
              People
              <br />
              Community
              <br />
              Better
              <br />
              Tomorrow
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
