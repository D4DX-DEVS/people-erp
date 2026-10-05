import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/site/RichContent";
import { isHtml } from "@/lib/richText";
import { resolveIcon } from "@/lib/siteIcons";
import { colorValue, colorTint } from "@/lib/siteColors";
import { heroTextCss, heroTextColor } from "@/lib/heroText";
import { cn } from "@/lib/utils";
import type { HeroTextStyle, PageSection, SectionItem } from "@/types/sitePage";

const paragraphs = (content?: string) =>
  (content || "").replace(/<\/(p|div)>/gi, "\n\n").replace(/<[^>]+>/g, "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

/** Editorial landing hero: eyebrow + two-tone title on the left, photo fading in from the right. */
export function SplitHero({
  eyebrow, title, subtitle, imageUrl, paragraphs: paras, html, ctaText, ctaLink, titleStyle, subtitleStyle,
}: {
  eyebrow?: string; title: string; subtitle?: string; imageUrl?: string;
  paragraphs?: string[]; html?: string; ctaText?: string; ctaLink?: string;
  /** Admin formatting for the title / subtitle; `hidden` removes the line (the title stays as screen-reader text). */
  titleStyle?: HeroTextStyle; subtitleStyle?: HeroTextStyle;
}) {
  const navigate = useNavigate();
  const words = title.trim().split(/\s+/);
  const first = words.length > 1 ? words[0] : title;
  const rest = words.length > 1 ? words.slice(1).join(" ") : "";
  // A picked colour replaces the two-tone split: both words take it.
  const tone = heroTextColor(titleStyle);
  const go = () => {
    if (!ctaLink) return;
    if (/^https?:\/\//i.test(ctaLink)) window.open(ctaLink, "_blank");
    else navigate(ctaLink);
  };

  return (
    <section className="relative isolate overflow-hidden bg-background [overflow-wrap:anywhere]">
      {imageUrl && (
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-[62%] lg:block">
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        </div>
      )}
      <div className="container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-xl lg:max-w-[38rem]">
          {eyebrow && (
            <p className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {eyebrow}<span className="h-px w-16 bg-primary" />
            </p>
          )}
          {titleStyle?.hidden ? (
            <h1 className="sr-only">{title}</h1>
          ) : (
            <h1
              className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
              style={heroTextCss(titleStyle, "title")}
            >
              <span className={cn("block", !tone && "text-foreground")} style={tone}>{first}</span>
              {rest && <span className={cn("block", !tone && "text-primary")} style={tone}>{rest}</span>}
            </h1>
          )}
          {subtitle && !subtitleStyle?.hidden && (
            <p
              className={cn("text-lg md:text-xl", !subtitleStyle?.color && "text-foreground/90", titleStyle?.hidden ? "mt-0" : "mt-4")}
              style={heroTextCss(subtitleStyle, "subtitle")}
            >
              {subtitle}
            </p>
          )}
          {html && isHtml(html) ? (
            <RichContent content={html} className="mt-6 text-[0.95rem] text-foreground/80" />
          ) : !!paras?.length && (
            <div className="mt-6 space-y-3 text-[0.95rem] leading-relaxed text-foreground/80">
              {paras.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            </div>
          )}
          {ctaText && (
            <Button size="lg" className="mt-8 rounded-full px-8 shadow-lg" onClick={go}>
              {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {imageUrl && (
        <div className="relative lg:hidden">
          <img src={imageUrl} alt={title} className="max-h-72 w-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent" />
        </div>
      )}
    </section>
  );
}

const PANEL_DEFAULTS = ["#dc2626", "#2563eb"];

/** Two side-by-side tinted panels — used for a short "problem / approach" card section. */
export function FeaturePanels({ section }: { section: PageSection }) {
  const items: SectionItem[] = section.items || [];
  if (!items.length) return null;
  return (
    <section className="container mx-auto px-4 pb-10">
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item, i) => {
          const tone = item.color ? colorValue(item.color) : PANEL_DEFAULTS[i % 2];
          const Icon = resolveIcon(item.icon);
          return (
            <div key={item._id || i} className="flex gap-5 rounded-3xl border p-6 shadow-sm md:p-8"
              style={{ backgroundColor: colorTint(item.backgroundColor || tone, 0.07), borderColor: colorTint(tone, 0.15) }}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full md:h-20 md:w-20"
                style={{ backgroundColor: colorTint(tone, 0.15), color: tone }}>
                <Icon className="h-7 w-7 md:h-9 md:w-9" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em]" style={{ color: tone }}>
                  <span className="h-px w-7" style={{ backgroundColor: tone }} />{item.title}
                </p>
                {item.subtitle && <h2 className="text-2xl font-extrabold leading-tight md:text-3xl">{item.subtitle}</h2>}
                {item.description && <p className="mt-2 leading-relaxed text-foreground/75">{item.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { paragraphs as splitParagraphs };
