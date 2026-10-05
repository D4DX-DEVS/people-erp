import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { media } from "@/lib/api";

export default function MediaListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await media.getPublic();
        if (mounted && res.success) setItems(res.data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <SiteShell>
      <PageHero pageKey="media" />
      <SiteBreadcrumbs items={[{ label: "Media Coverage" }]} />
      <PageBody>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No media coverage yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((m) => (
              <a key={m._id} href={m.link || "#"} target="_blank" rel="noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                {m.imageUrl && <img loading="lazy" decoding="async" src={m.imageUrl} alt={m.title} className="h-36 w-full object-cover" />}
                <div className="space-y-1 p-4">
                  {m.source && <span className="text-xs font-medium uppercase tracking-wide text-primary">{m.source}</span>}
                  <h3 className="font-malayalam text-[19px] font-normal leading-[1.2] sm:text-[20px]">{m.title}</h3>
                </div>
              </a>
            ))}
          </div>
        )}
      </PageBody>
    </SiteShell>
  );
}
