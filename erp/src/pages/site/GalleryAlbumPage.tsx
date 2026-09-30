import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BackToTop } from "@/components/site/BackToTop";
import { gallery, website } from "@/lib/api";

export default function GalleryAlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [albumRes, homeRes]: any = await Promise.all([
          gallery.getPublicById(id as string),
          website.getHome().catch(() => null),
        ]);
        if (!mounted) return;
        setAlbum(albumRes?.data || null);
        setSettings(homeRes?.data?.settings || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const images: any[] = album?.images || [];
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const calc = () => setCols(window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  const columns: { img: any; idx: number }[][] = Array.from({ length: Math.min(cols, images.length) || 1 }, () => []);
  images.forEach((img, idx) => columns[idx % columns.length].push({ img, idx }));
  const prev = useCallback(() => setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length)), [images.length]);
  const next = useCallback(() => setLightbox((i) => (i === null ? i : (i + 1) % images.length)), [images.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader donateLink={settings?.donation?.paymentLink} />
      <SiteBreadcrumbs items={[{ label: "Gallery", href: "/gallery" }, { label: album?.title || "Album" }]} />
      <PageBody>
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/#gallery")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Gallery
        </Button>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !album ? (
          <p className="py-20 text-center text-muted-foreground">Album not found.</p>
        ) : (
          <>
            <h1 className="mx-auto max-w-3xl text-center text-xl font-bold md:text-2xl">{album.title}</h1>
            {album.description && <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">{album.description}</p>}
            <div className="mx-auto mt-8 flex justify-center gap-4">
              {columns.map((col, c) => (
                <div key={c} className="flex min-w-0 flex-1 flex-col gap-4" style={{ maxWidth: "20rem" }}>
                  {col.map(({ img, idx }) => (
                    <button key={img._id} onClick={() => setLightbox(idx)}
                      className="group block w-full overflow-hidden rounded-2xl bg-muted">
                      <img src={img.imageUrl} alt={img.caption || album.title} loading="lazy" decoding="async"
                        className="h-auto w-full transition-transform duration-500 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </PageBody>
      <SiteFooter settings={settings} />
      <MobileBottomNav />
      <BackToTop />

      {lightbox !== null && images[lightbox] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <button aria-label="Previous" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              onClick={(e) => { e.stopPropagation(); prev(); }}>
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}
          <img src={images[lightbox].imageUrl} alt={images[lightbox].caption || ""} className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button aria-label="Next" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              onClick={(e) => { e.stopPropagation(); next(); }}>
              <ChevronRight className="h-7 w-7" />
            </button>
          )}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">{lightbox + 1} / {images.length}</span>
        </div>
      )}
    </div>
  );
}
