import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { PageSections } from "@/components/site/PageSections";
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

  return (
    <SiteShell>
      <PageHero title={page.hero?.title || page.title} subtitle={page.hero?.subtitle} imageUrl={page.hero?.imageUrl} />
      <PageSections sections={page.sections} />
    </SiteShell>
  );
}
