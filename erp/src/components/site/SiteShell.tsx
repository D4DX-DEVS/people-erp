import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BackToTop } from "@/components/site/BackToTop";
import { useSiteData } from "@/hooks/useSiteData";
import { cn } from "@/lib/utils";

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
  const { data, isLoading } = useSiteData();
  const s = data?.settings || {};
  const donateLink = s.donation?.paymentLink || s.hero?.ctaLink;

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader donateLink={donateLink} />
      {children}
      <SiteFooter settings={s} />
      <MobileBottomNav />
      <BackToTop />
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

/** Page hero band shared by the public inner pages. */
export function PageHero({ title, subtitle, imageUrl }: { title: string; subtitle?: string; imageUrl?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-8 text-center text-primary-foreground [overflow-wrap:anywhere] sm:py-16 md:py-24">
      {imageUrl && (
        <>
          <img src={imageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}
      <div className="container relative mx-auto px-4">
        <h1 className="mx-auto max-w-3xl text-2xl font-extrabold sm:text-3xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-base text-primary-foreground/90 sm:mt-4 sm:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
