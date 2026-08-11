import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { videos } from "@/lib/api";
import { getYouTubeId, videoThumb } from "@/hooks/useSiteData";

export default function VideosListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await videos.getPublic();
        if (!mounted) return;
        if (res.success) setItems(res.data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <SiteShell>
      <PageHero title="Videos" subtitle="Stories of change in motion." />

      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">No videos yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((v) => (
                <button
                  key={v._id}
                  onClick={() => setActiveVideo(v.videoUrl)}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    {videoThumb(v.videoUrl, v.thumbnailUrl) ? (
                      <img src={videoThumb(v.videoUrl, v.thumbnailUrl)} alt={v.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-hero" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6 translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 p-5">
                    <h3 className="font-semibold">{v.title}</h3>
                    {v.description && <p className="line-clamp-2 text-sm text-muted-foreground">{v.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!activeVideo} onOpenChange={(o) => !o && setActiveVideo(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          {activeVideo && (
            getYouTubeId(activeVideo) ? (
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${getYouTubeId(activeVideo)}?autoplay=1`}
                  title="Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={activeVideo} controls autoPlay className="aspect-video w-full" />
            )
          )}
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}
