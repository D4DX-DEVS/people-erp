import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BackToTop } from "@/components/site/BackToTop";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { ZakatFab } from "@/components/site/ZakatFab";
import { useSiteData } from "@/hooks/useSiteData";
import { useConfig } from "@/contexts/ConfigContext";
import { usesFloatingZakatButton } from "@/config/orgFeatures";
import { isHomeSectionVisible } from "@/types/siteHome";
import { cn } from "@/lib/utils";
import { HERO_PAGES, heroTextCss, type HeroPageKey } from "@/lib/heroText";
import type { HeroTextStyle } from "@/types/sitePage";

interface SiteShellProps {
  children?: ReactNode;
  /** Show the full-page spinner while the page's own data is loading too. */
  loading?: boolean;
}

/**
 * Shared wrapper for public site pages: sticky header + footer fed from the
 * cached aggregated home payload (react-query dedupes across pages).
 */
export function SiteShell({ children, loading = false }: SiteShellProps) {
  const { org } = useConfig();
  const { data, isLoading } = useSiteData();
  const s = data?.settings || {};
  const donateLink = s.donation?.paymentLink || s.hero?.ctaLink;
  // Same gate the header uses for its icon button, so the shortcut never
  // disappears when a franchise switches the calculator section off.
  const floatingZakat =
    isHomeSectionVisible(s.homeLayout, "calculator") && usesFloatingZakatButton(org.key);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="site-font min-h-screen bg-background">
      <ScrollProgress />
      <SiteHeader donateLink={donateLink} />
      {children}
      <SiteFooter settings={s} />
      <MobileBottomNav />
      <BackToTop />
      {floatingZakat && <ZakatFab />}
    </div>
  );
}

/**
 * Card container the public inner pages put their body in: a muted band with a
 * single raised surface on it, so the content reads as a sheet rather than as
 * text floating on the page background.
 *
 * `flush` drops the card's own padding for bodies that already bring their own
 * — the builder-driven pages render full-width section bands whose backgrounds
 * have to reach the card's edges, and `overflow-hidden` keeps those bands
 * inside its rounded corners.
 */
export function PageBody({
  children,
  className,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className="bg-muted/40 py-6 sm:py-10">
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm",
            !flush && "p-4 sm:p-6 md:p-10",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Page hero band shared by the public inner pages.
 *
 * Two ways to drive it:
 *  - `pageKey` for the built-in pages (Videos, Gallery, …): the wording defaults
 *    to HERO_PAGES, and whatever the admin saved under Website Settings → Page
 *    Heroes — copy, formatting, hidden — wins over it.
 *  - `title` / `subtitle` / `titleStyle` / `subtitleStyle` directly, for pages
 *    that carry their own hero (project and scheme detail pages).
 *
 * A hidden line is dropped from the band but its text is kept as screen-reader
 * text, so the page never loses its <h1>. With both lines hidden and no image
 * there is nothing left to draw, so the band itself goes.
 */
export function PageHero({
  pageKey, title, subtitle, imageUrl, titleStyle, subtitleStyle,
}: {
  pageKey?: HeroPageKey;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  titleStyle?: HeroTextStyle;
  subtitleStyle?: HeroTextStyle;
}) {
  const { data } = useSiteData();
  const builtIn = pageKey ? HERO_PAGES.find((p) => p.key === pageKey) : undefined;
  const saved = pageKey ? data?.settings?.pageHeroes?.[pageKey] : undefined;

  const heading = saved?.title?.trim() || title || builtIn?.title || "";
  const lead = saved?.subtitle?.trim() || subtitle || builtIn?.subtitle;
  const titleFormat = pageKey ? saved?.titleStyle : titleStyle;
  const leadFormat = pageKey ? saved?.subtitleStyle : subtitleStyle;

  const showTitle = !titleFormat?.hidden;
  const showLead = !!lead && !leadFormat?.hidden;

  if (!showTitle && !showLead && !imageUrl) return <h1 className="sr-only">{heading}</h1>;

  return (
    <section className="relative overflow-hidden bg-gradient-hero py-8 text-center text-primary-foreground [overflow-wrap:anywhere] sm:py-16 md:py-24">
      {imageUrl && (
        <>
          <img src={imageUrl} alt={showTitle ? heading : ""} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}
      <div className="container relative mx-auto px-4">
        {showTitle ? (
          <h1 className="mx-auto max-w-3xl text-2xl font-extrabold sm:text-3xl md:text-5xl" style={heroTextCss(titleFormat, "title")}>{heading}</h1>
        ) : (
          <h1 className="sr-only">{heading}</h1>
        )}
        {showLead && (
          <p
            className={cn("mx-auto max-w-2xl text-base text-primary-foreground/90 sm:text-lg", showTitle ? "mt-3 sm:mt-4" : "mt-0")}
            style={heroTextCss(leadFormat, "subtitle")}
          >
            {lead}
          </p>
        )}
      </div>
    </section>
  );
}
