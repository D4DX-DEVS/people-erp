import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { gallery } from "@/lib/api";

export default function GalleryListPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await gallery.getPublic();
        if (!mounted) return;
        if (res.success) setAlbums(res.data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <SiteShell>
      <PageHero title="Gallery" subtitle="Glimpses from our work on the ground." />

      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : albums.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">No albums yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {albums.map((a) => {
                const cover = a.coverImageUrl || a.images?.[0]?.imageUrl;
                const count = a.images?.length || 0;
                return (
                  <button
                    key={a._id}
                    onClick={() => navigate(`/gallery/${a._id}`)}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
                  >
                    {cover ? (
                      <img src={cover} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-hero"><Sparkles className="h-10 w-10 text-primary-foreground/70" /></div>
                    )}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-sm font-medium text-white">{a.title}{count ? ` · ${count}` : ""}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
