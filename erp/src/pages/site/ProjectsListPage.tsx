import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { website } from "@/lib/api";

// Project category images mapping (matches admin panel / SiteHome)
const CATEGORY_IMAGES: Record<string, string> = {
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  healthcare: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  housing: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  livelihood: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  emergency_relief: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80",
  infrastructure: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80",
  social_welfare: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  other: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80",
};
const categoryImage = (category?: string) => CATEGORY_IMAGES[category || "other"] || CATEGORY_IMAGES.other;

const CATEGORIES = ["education", "healthcare", "housing", "livelihood", "emergency_relief", "infrastructure", "social_welfare", "other"];
const STATUSES: Array<{ label: string; value: "ongoing" | "completed" | null }> = [
  { label: "All", value: null },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
];

export default function ProjectsListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<"ongoing" | "completed" | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const params: any = { page, limit: 12 };
        if (category) params.category = category;
        if (status) params.status = status;
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
  }, [category, status, page]);

  return (
    <SiteShell>
      <PageHero title="Our Projects" subtitle="Initiatives transforming lives in our communities." />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <Button
              variant={category === null ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => { setCategory(null); setPage(1); }}
            >
              All
            </Button>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                variant={category === c ? "default" : "outline"}
                size="sm"
                className="rounded-full capitalize"
                onClick={() => { setCategory(c); setPage(1); }}
              >
                {c.replace(/_/g, " ")}
              </Button>
            ))}
          </div>

          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {STATUSES.map((st) => (
              <Button
                key={st.label}
                variant={status === st.value ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => { setStatus(st.value); setPage(1); }}
              >
                {st.label}
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
                {items.map((p) => (
                  <Card key={p._id} className="group overflow-hidden border-border/60 transition-shadow hover:shadow-xl">
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={categoryImage(p.category)}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                    <CardContent className="space-y-2 p-6">
                      <div className="flex items-center gap-2">
                        {p.category && <Badge variant="secondary" className="capitalize">{p.category.replace(/_/g, " ")}</Badge>}
                        <Badge variant={p.status === "completed" ? "secondary" : "default"} className="capitalize">
                          {p.status === "completed" ? "Completed" : "Ongoing"}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
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
