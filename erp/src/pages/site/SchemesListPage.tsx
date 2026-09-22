import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { SchemeCard } from "@/components/site/SchemeCard";
import { website } from "@/lib/api";
import { schemePath, type PublicScheme } from "@/lib/siteSchemes";
import { PROJECT_CATEGORIES, categoryLabel } from "@/lib/siteProjects";

/** Schemes and projects share the category enum (api/src/models/Scheme.js). */
const SCHEME_CATEGORIES = PROJECT_CATEGORIES;

interface SchemeListResponse {
  success?: boolean;
  data?: PublicScheme[];
  pagination?: { page: number; pages: number };
}

/**
 * Public scheme archive — where "View all schemes" on the home page lands.
 *
 * Open to anyone, unlike /public-schemes, which lists what a signed-in
 * beneficiary is eligible to apply for. Cards reuse the home page's SchemeCard
 * so the two read as one system, and each opens the scheme's detail page.
 */
export default function SchemesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicScheme[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const params: Record<string, string | number> = { page, limit: 12 };
        if (category) params.category = category;
        const res = (await website.getPublicSchemes(params)) as SchemeListResponse;
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
      <PageHero title="Schemes & Programs" subtitle="Focused initiatives for a stronger, self-reliant community." />
      <SiteBreadcrumbs items={[{ label: "Schemes" }]} />

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
          {SCHEME_CATEGORIES.map((c) => (
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
          <p className="py-20 text-center text-muted-foreground">No schemes in this category yet.</p>
        ) : (
          <>
            {/* Same flex-wrap sizing as the home page's scheme grid, so an
                incomplete last row centres instead of hugging the left. */}
            <div className="flex flex-wrap justify-center gap-5">
              {items.map((s) => (
                <div key={s._id} className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]">
                  <SchemeCard scheme={s} onOpen={() => navigate(schemePath(s))} />
                </div>
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
