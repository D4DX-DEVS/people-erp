import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteShell, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { website } from "@/lib/api";

/** How many other stories the sidebar shows. */
const SIDEBAR_COUNT = 6;

export default function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [others, setOthers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        // One extra, because the story being read is almost always in the
        // first page of results and gets filtered out below.
        const [res, listRes]: any = await Promise.all([
          website.getPublicNewsById(id as string),
          website.getPublicNews({ page: 1, limit: SIDEBAR_COUNT + 1 }).catch(() => null),
        ]);
        if (!mounted) return;
        // ResponseHelper wraps the payload: data = { newsEvent }
        if (res.success && res.data?.newsEvent) {
          setItem(res.data.newsEvent);
        } else {
          setNotFound(true);
        }
        const list: any[] = listRes?.data?.newsEvents || [];
        setOthers(list.filter((n) => n._id !== id).slice(0, SIDEBAR_COUNT));
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <SiteShell loading={loading}>
      <SiteBreadcrumbs
        items={[{ label: "News & Events", href: "/news" }, { label: item?.title || "Article" }]}
      />
      <PageBody>
        {/* minmax(0,1fr) rather than 1fr: a grid track is sized from its
            content by default, so a wide image or an unbroken word in the
            article would otherwise push the sidebar off the card. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
          <div className="min-w-0">
            <Button variant="ghost" className="mb-4" onClick={() => navigate("/news")}>
              ← All news
            </Button>

            {notFound || !item ? (
              <div className="py-20 text-center">
                <p className="mb-4 text-muted-foreground">This news item could not be found.</p>
                <Button variant="outline" className="rounded-full" onClick={() => navigate("/news")}>
                  Back to News
                </Button>
              </div>
            ) : (
              <article>
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {item.category && <Badge variant="secondary" className="capitalize">{item.category.replace(/_/g, " ")}</Badge>}
                  {item.publishDate && <span>{new Date(item.publishDate).toLocaleDateString()}</span>}
                </div>
                <h1 className="text-3xl font-bold md:text-4xl">{item.title}</h1>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="mt-6 w-full rounded-3xl object-cover" />
                )}
                <div className="prose prose-neutral mt-8 max-w-none space-y-4 whitespace-pre-line leading-relaxed text-foreground/90">
                  {(item.description || "").split(/\n\n+/).map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </article>
            )}
          </div>

          {others.length > 0 && (
            // A rule between the two columns from `lg`, and above the sidebar
            // once the grid stacks — at that width it sits under the article
            // rather than beside it.
            <aside className="min-w-0 border-t border-border/60 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                More news
              </h2>
              <ul className="mt-4 space-y-1">
                {others.map((n) => (
                  <li key={n._id}>
                    <Link
                      to={`/news/${n._id}`}
                      className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
                    >
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {n.imageUrl ? (
                          <img
                            src={n.imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-hero">
                            <Sparkles className="h-5 w-5 text-primary-foreground/70" />
                          </div>
                        )}
                      </div>
                      <span className="line-clamp-3 min-w-0 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                        {n.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </PageBody>
    </SiteShell>
  );
}
