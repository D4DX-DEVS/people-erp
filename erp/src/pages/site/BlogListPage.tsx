import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronRight as ReadMoreIcon, Loader2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { blogs } from "@/lib/api";

export default function BlogListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res: any = await blogs.getPublic({ page, limit: 12 });
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
  }, [page]);

  return (
    <SiteShell>
      <PageHero title="From our Blog" subtitle="Perspectives, insights and stories." />

      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">No blog posts yet.</p>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                {items.map((b) => (
                  <Card
                    key={b._id}
                    className="group cursor-pointer overflow-hidden border-border/60 transition-shadow hover:shadow-xl"
                    onClick={() => navigate(`/blog/${b.slug}`)}
                  >
                    {b.coverImageUrl ? (
                      <img src={b.coverImageUrl} alt={b.title} className="h-44 w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-gradient-hero"><Quote className="h-12 w-12 text-primary-foreground/70" /></div>
                    )}
                    <CardContent className="space-y-2 p-6">
                      <div className="text-xs text-muted-foreground">{b.author}{b.publishDate ? ` · ${new Date(b.publishDate).toLocaleDateString()}` : ""}</div>
                      <h3 className="text-lg font-semibold">{b.title}</h3>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{b.excerpt}</p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">Read more <ReadMoreIcon className="h-4 w-4" /></span>
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
        </div>
      </section>
    </SiteShell>
  );
}
