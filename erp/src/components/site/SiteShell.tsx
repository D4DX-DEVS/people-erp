import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useSiteData } from "@/hooks/useSiteData";

interface SiteShellProps {
  children: ReactNode;
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
    </div>
  );
}

/** Page hero band shared by the public inner pages. */
export function PageHero({ title, subtitle, imageUrl }: { title: string; subtitle?: string; imageUrl?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-16 text-center text-primary-foreground [overflow-wrap:anywhere] md:py-24">
      {imageUrl && (
        <>
          <img src={imageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}
      <div className="container relative mx-auto px-4">
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold md:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">{subtitle}</p>}
      </div>
    </section>
  );
}
