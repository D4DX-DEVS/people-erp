import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { website } from "@/lib/api";
import { ProjectCard } from "@/components/site/ProjectCard";
import { PROJECT_CATEGORIES, categoryLabel } from "@/lib/siteProjects";

export default function ProjectsListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const params: any = { page, limit: 12 };
        if (category) params.category = category;
        const res: any = await website.getPublicProjects(params);
        if (!mounted) return;
        if (res.success) {
          setItems(res.data || []);
          setPagination(res.pagination || null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [category, page]);

  return (
    <SiteShell>
      <PageHero title="Our Projects" subtitle="Initiatives transforming lives in our communities." />
      <SiteBreadcrumbs items={[{ label: "Projects" }]} />

      <PageBody>
        <div className="mb-8 flex flex-wrap justify-center gap-2 sm:mb-10">
          <Button
            variant={category === null ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => { setCategory(null); setPage(1); }}
          >
            All
          </Button>
          {PROJECT_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={category === c ? "default" : "outline"}
              size="sm"
              className="rounded-full capitalize"
              onClick={() => { setCategory(c); setPage(1); }}
            >
              {categoryLabel(c)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No projects yet.</p>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((p, i) => <ProjectCard key={p._id} project={p} index={i} showStatus />)}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {pagination.pages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </PageBody>
    </SiteShell>
  );
}
