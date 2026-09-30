import { RichContent } from "@/components/site/RichContent";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BackToTop } from "@/components/site/BackToTop";
import { ContentRail } from "@/components/site/ContentRail";
import { blogs, website } from "@/lib/api";

export default function BlogDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [blogRes, homeRes]: any = await Promise.all([
          blogs.getPublicBySlug(slug as string),
          website.getHome().catch(() => null),
        ]);
        if (!mounted) return;
        setBlog(blogRes?.data || null);
        setSettings(homeRes?.data?.settings || null);
        const cur = blogRes?.data;
        const listRes: any = await blogs.getPublic({ limit: "24" }).catch(() => null);
        if (!mounted) return;
        const others: any[] = (listRes?.data || []).filter((b: any) => b.slug !== slug);
        // Same-category posts first, then the rest by recency.
        others.sort((a, b) => Number(b.category === cur?.category) - Number(a.category === cur?.category));
        setRelated(others.slice(0, 8));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader donateLink={settings?.donation?.paymentLink} />
      <SiteBreadcrumbs items={[{ label: "Blog", href: "/blogs" }, { label: blog?.title || "Article" }]} />
      <PageBody>
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !blog ? (
          <p className="py-20 text-center text-muted-foreground">Article not found.</p>
        ) : (
          <>
            {blog.category && <Badge variant="secondary" className="capitalize">{blog.category}</Badge>}
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">{blog.title}</h1>
            <div className="mt-2 text-sm text-muted-foreground">
              {blog.author}{blog.publishDate ? ` · ${new Date(blog.publishDate).toLocaleDateString()}` : ""}
            </div>
            {blog.coverImageUrl && <img src={blog.coverImageUrl} alt={blog.title} className="mt-6 w-full rounded-2xl object-cover" />}
            <RichContent content={blog.content} className="mt-8 max-w-none text-foreground/90" />
          </>
        )}
      </PageBody>
      {related.length > 0 && (
        <section className="bg-[#faf7f2] py-4 sm:py-6">
          <div className="container mx-auto px-4">
            <ContentRail
              heading="Related Blogs"
              onOpen={(s) => navigate(`/blog/${s}`)}
              items={related.map((b) => ({
                _id: b.slug,
                title: b.title,
                imageUrl: b.coverImageUrl,
                eyebrow: (b.category || "general").replace(/_/g, " "),
                meta: b.publishDate ? new Date(b.publishDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                byline: b.author ? `By ${b.author}` : undefined,
              }))}
            />
          </div>
        </section>
      )}
      <SiteFooter settings={settings} />
      <MobileBottomNav />
      <BackToTop />
    </div>
  );
}
