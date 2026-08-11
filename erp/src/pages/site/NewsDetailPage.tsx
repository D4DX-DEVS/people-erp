import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteShell } from "@/components/site/SiteShell";
import { website } from "@/lib/api";

export default function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const res: any = await website.getNewsById(id as string);
        if (!mounted) return;
        // ResponseHelper wraps the payload: data = { newsEvent }
        if (res.success && res.data?.newsEvent) {
          setItem(res.data.newsEvent);
        } else {
          setNotFound(true);
        }
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
      <div className="container mx-auto max-w-3xl px-4 py-10">
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
    </SiteShell>
  );
}
