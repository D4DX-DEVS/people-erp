import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/site/FilterChips";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { website } from "@/lib/api";

const CATEGORIES = ["news", "event", "announcement", "success_story"];

// Title-cased in the data rather than with a `capitalize` class: the overflow
// options render in a portal, outside the row, so they would not inherit it.
const categoryLabel = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const FILTERS = [
  { label: "All", value: null },
  ...CATEGORIES.map((c) => ({ label: categoryLabel(c), value: c })),
];

export default function NewsListPage() {
  const navigate = useNavigate();
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
        const res: any = await website.getPublicNews(params);
        if (!mounted) return;
        if (res.success) {
          // ResponseHelper wraps the payload: data = { newsEvents, pagination }
          setItems(res.data?.newsEvents || []);
          setPagination(res.data?.pagination || null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [category, page]);

  return (
    <SiteShell>
      <PageHero title="News & Events" subtitle="Latest happenings and announcements." />
      <SiteBreadcrumbs items={[{ label: "News & Events" }]} />

      <PageBody>
        <FilterChips
          className="mb-10"
          options={FILTERS}
          value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No news yet.</p>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((n) => (
                <Card
                  key={n._id}
                  className="group cursor-pointer overflow-hidden border-border/60 transition-shadow hover:shadow-xl"
                  onClick={() => navigate(`/news/${n._id}`)}
                >
                  {n.imageUrl ? (
                    <img src={n.imageUrl} alt={n.title} className="h-44 w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-gradient-hero"><Sparkles className="h-12 w-12 text-primary-foreground/70" /></div>
                  )}
                  <CardContent className="space-y-2 p-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {n.category && <Badge variant="outline" className="capitalize">{n.category.replace(/_/g, " ")}</Badge>}
                      {n.publishDate && <span>{new Date(n.publishDate).toLocaleDateString()}</span>}
                    </div>
                    <h3 className="text-lg font-semibold">{n.title}</h3>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{n.description}</p>
                  </CardContent>
                </Card>
              ))}
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
