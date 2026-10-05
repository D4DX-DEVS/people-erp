import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { PageSections } from "@/components/site/PageSections";
import { SplitHero, FeaturePanels, splitParagraphs } from "@/components/site/SplitHero";
import { usePublicPage } from "@/hooks/useSitePages";

export default function SitePageView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = usePublicPage(slug);

  useEffect(() => {
    if (page) {
      document.title = page.seo?.title || page.title;
    }
  }, [page]);

  if (isLoading) {
    return <SiteShell loading />;
  }

  if (!page) {
    return (
      <SiteShell>
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-32 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="max-w-md text-muted-foreground">
            The page you're looking for doesn't exist or is no longer available.
          </p>
          <Button className="rounded-full" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </SiteShell>
    );
  }

  // Landing layout: the first image + text block folds into the hero, and a
  // short first card grid becomes two feature panels. Everything else renders
  // through the normal section blocks.
  const sorted = (page.sections || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const intro = sorted.find((x) => x.type === "image-text");
  const panels = sorted.find((x) => x.type === "cards" && (x.items?.length || 0) > 0 && (x.items?.length || 0) <= 2);
  const rest = sorted.filter((x) => x !== intro && x !== panels);
  const heroImage = intro?.imageUrl || page.hero?.imageUrl;

  return (
    <SiteShell>
      <SiteBreadcrumbs items={[{ label: page.navLabel || page.title }]} />
      <SplitHero
        eyebrow={page.navLabel || undefined}
        title={page.hero?.title || page.title}
        subtitle={page.hero?.subtitle}
        titleStyle={page.hero?.titleStyle}
        subtitleStyle={page.hero?.subtitleStyle}
        imageUrl={heroImage}
        paragraphs={splitParagraphs(intro?.content)}
        html={intro?.content}
        ctaText={intro?.ctaText}
        ctaLink={intro?.ctaLink}
      />
      {panels && <FeaturePanels section={panels} />}
      {rest.length > 0 && (
        <PageBody flush>
          <PageSections sections={rest} />
        </PageBody>
      )}
    </SiteShell>
  );
}
