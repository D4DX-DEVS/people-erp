import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { website } from "@/lib/api";

interface BrochureItem {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName?: string;
  category?: string;
}

export default function DownloadsPage() {
  const [items, setItems] = useState<BrochureItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res: any = await website.getPublicBrochures({ page, limit: 12 });
        if (!mounted) return;
        if (res.success) {
          setItems(res.data?.brochures || []);
          setPagination(res.data?.pagination || null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [page]);

  return (
    <SiteShell>
      <PageHero title="Downloads" subtitle="Brochures, reports and guidelines you can download." />
      <SiteBreadcrumbs items={[{ label: "Downloads" }]} />

      <PageBody>
        <div className="mb-10 flex justify-center">
          <Link to="/#calculator">
            <Button variant="outline" className="rounded-full">
              <Calculator className="mr-2 h-4 w-4" /> Go to Zakat Calculator
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No downloads available yet.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((br) => (
                <a
                  key={br._id}
                  href={br.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{br.title}</h3>
                    {br.description && <p className="line-clamp-1 text-sm text-muted-foreground">{br.description}</p>}
                  </div>
                  <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
                </a>
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
