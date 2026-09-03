import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Sparkles, ChevronRight, Play, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getYouTubeId, videoThumb } from "@/hooks/useSiteData";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/siteIcons";
import { iconBadgeStyle, colorValue, colorTint, isDarkColor } from "@/lib/siteColors";
import type { PageSection, SectionItem } from "@/types/sitePage";

/**
 * Public renderer for builder sections (SitePage + ProjectPage). Each section
 * type maps to one block; colours/backgrounds follow the section's own
 * accent + background settings.
 */

/**
 * Descriptions longer than this (or with more than one paragraph) are too long
 * to sit inside a card, so the card clamps them and opens a detail dialog.
 */
const DETAIL_TEXT_THRESHOLD = 180;
const hasDetail = (text?: string) => {
  const t = (text || "").trim();
  return t.length > DETAIL_TEXT_THRESHOLD || /\n\s*\n/.test(t);
};

type BadgeStyle = { color: string; backgroundColor: string };
/** Icon badge on dark section backgrounds (brand gradient / dark custom colour). */
const DARK_BADGE: BadgeStyle = { color: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" };

const isExternal = (url?: string) => /^https?:\/\//i.test(url || "");

const colsClass = (n?: number, fallback = 3) => {
  const cols = Math.min(4, Math.max(2, n || fallback));
  if (cols === 2) return "sm:grid-cols-2";
  if (cols === 4) return "sm:grid-cols-2 lg:grid-cols-4";
  return "sm:grid-cols-2 lg:grid-cols-3";
};

function SectionHeading({
  title, subtitle, icon, badge, onDark,
}: { title?: string; subtitle?: string; icon?: string; badge: BadgeStyle; onDark?: boolean }) {
  if (!title && !subtitle && !icon) return null;
  const Icon = icon ? resolveIcon(icon) : null;
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {Icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={badge}>
          <Icon className="h-7 w-7" />
        </div>
      )}
      {title && <h2 className="text-2xl font-bold md:text-4xl">{title}</h2>}
      {subtitle && <p className={cn("mt-3", onDark ? "text-white/80" : "text-muted-foreground")}>{subtitle}</p>}
    </div>
  );
}

/** Render a page's sections in their persisted `order`. */
export function PageSections({ sections }: { sections?: PageSection[] }) {
  return (
    <>
      {(sections || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((section, i) => (
          <SectionBlock key={section._id || i} section={section} />
        ))}
    </>
  );
}

export function SectionBlock({ section }: { section: PageSection }) {
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const goLink = (link?: string) => {
    if (!link) return;
    if (isExternal(link)) window.open(link, "_blank");
    else navigate(link);
  };

  const items = section.items || [];
  const images = section.images || [];
  const contentItems = section.contentItems || [];

  // Colour handling: the section accent drives icons/highlights; dark backgrounds switch badges to white.
  const accent = section.accentColor;
  const customBg = section.background === "custom" && section.backgroundColor ? colorValue(section.backgroundColor) : "";
  const onDark = section.background === "primary" || (section.background === "custom" && !!customBg && isDarkColor(customBg));
  const badge = (itemColor?: string): BadgeStyle => (onDark ? DARK_BADGE : iconBadgeStyle(itemColor, accent));

  let body: React.ReactNode = null;

  switch (section.type) {
    case "richtext": {
      if (!section.content?.trim()) return null;
      body = (
        <div className="mx-auto max-w-3xl">
          {section.content.split(/\n\s*\n/).map((para, idx) => (
            <p key={idx} className="mb-4 whitespace-pre-line leading-relaxed text-muted-foreground">{para}</p>
          ))}
        </div>
      );
      break;
    }

    case "image-text": {
      if (!section.content?.trim() && !section.imageUrl) return null;
      const imageFirst = (section.imagePosition || "right") === "left";
      body = (
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className={imageFirst ? "lg:order-1" : "lg:order-2"}>
            {section.imageUrl ? (
              <img src={section.imageUrl} alt={section.title || ""} className="w-full rounded-3xl object-cover shadow-xl" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-gradient-hero">
                <Sparkles className="h-16 w-16 text-primary-foreground/70" />
              </div>
            )}
          </div>
          <div className={imageFirst ? "lg:order-2" : "lg:order-1"}>
            {section.content?.split(/\n\s*\n/).map((para, idx) => (
              <p key={idx} className="mb-4 whitespace-pre-line leading-relaxed text-muted-foreground">{para}</p>
            ))}
          </div>
        </div>
      );
      break;
    }

    case "cards": {
      if (!items.length) return null;
      body = (
        <div className={`grid gap-6 ${colsClass(section.columns)}`}>
          {items.map((item, idx) => (
            <CardTile key={item._id || idx} item={item} onLink={goLink} badge={iconBadgeStyle(item.color, accent)} />
          ))}
        </div>
      );
      break;
    }

    case "stats": {
      if (!items.length) return null;
      body = (
        <div className={`grid grid-cols-2 gap-6 ${colsClass(section.columns, 4)}`}>
          {items.map((item, idx) => {
            const Icon = resolveIcon(item.icon);
            return (
              <div key={item._id || idx} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={badge(item.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className={cn("text-3xl font-extrabold md:text-4xl", onDark ? "text-white" : "text-foreground")}>{item.value}</div>
                <div className={cn("mt-1 text-sm", onDark ? "text-white/80" : "text-muted-foreground")}>{item.title}</div>
              </div>
            );
          })}
        </div>
      );
      break;
    }

    case "timeline": {
      if (!items.length) return null;
      body = (
        <div className="relative mx-auto max-w-2xl border-l-2 pl-8" style={{ borderColor: onDark ? "rgba(255,255,255,0.4)" : colorTint(accent, 0.35) }}>
          {items.map((item, idx) => (
            <div key={item._id || idx} className="relative pb-10 last:pb-0">
              <span
                className="absolute -left-[2.35rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background"
                style={{ borderColor: onDark ? "#ffffff" : colorValue(accent) }}
              />
              {item.value && <div className="text-sm font-bold" style={{ color: onDark ? "#ffffff" : colorValue(accent) }}>{item.value}</div>}
              {item.title && <h3 className="mt-1 font-semibold">{item.title}</h3>}
              {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
            </div>
          ))}
        </div>
      );
      break;
    }

    case "team": {
      if (!items.length) return null;
      body = (
        <div className={`grid gap-6 ${colsClass(section.columns, 4)}`}>
          {items.map((item, idx) => (
            <TeamTile key={item._id || idx} item={item} onLink={goLink} />
          ))}
        </div>
      );
      break;
    }

    case "faq": {
      if (!items.length) return null;
      body = (
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, idx) => (
              <AccordionItem key={item._id || idx} value={item._id || `faq-${idx}`}>
                <AccordionTrigger className="text-left">{item.title}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.description}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );
      break;
    }

    case "cta": {
      if (!section.title && !section.content && !section.ctaText) return null;
      return (
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl bg-gradient-hero p-8 text-center text-primary-foreground md:p-12">
              {section.title && <h2 className="text-2xl font-bold md:text-4xl">{section.title}</h2>}
              {section.content && (
                <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-primary-foreground/90">{section.content}</p>
              )}
              {section.ctaText && section.ctaLink && (
                <Button size="lg" variant="secondary" className="mt-6 rounded-full" onClick={() => goLink(section.ctaLink)}>
                  {section.ctaText}
                </Button>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "video": {
      if (!section.videoUrl) return null;
      const ytId = getYouTubeId(section.videoUrl);
      body = (
        <div className="mx-auto aspect-video max-w-4xl overflow-hidden rounded-3xl shadow-xl">
          {ytId ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={section.title || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={section.videoUrl} controls className="h-full w-full" />
          )}
        </div>
      );
      break;
    }

    case "gallery": {
      if (!images.length) return null;
      body = (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setLightbox(idx)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                {img.imageUrl && (
                  <img src={img.imageUrl} alt={img.caption || ""} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
                {img.caption && (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-sm font-medium text-white">{img.caption}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
            <DialogContent className="max-w-3xl overflow-hidden p-0">
              {lightbox !== null && images[lightbox] && (
                <div>
                  <img src={images[lightbox].imageUrl} alt={images[lightbox].caption || ""} className="max-h-[80vh] w-full object-contain" />
                  {images[lightbox].caption && (
                    <p className="p-4 text-center text-sm text-muted-foreground">{images[lightbox].caption}</p>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      );
      break;
    }

    case "content": {
      if (!contentItems.length) return null;
      body = (
        <>
          <ContentGrid source={section.contentSource} items={contentItems} columns={section.columns} navigate={navigate} onPlayVideo={setActiveVideo} />
          {section.ctaText && section.ctaLink && (
            <div className="mt-8 text-center">
              <Button variant="outline" className="rounded-full" onClick={() => goLink(section.ctaLink)}>
                {section.ctaText} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
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
        </>
      );
      break;
    }

    default:
      return null;
  }

  if (!body) return null;

  const bgClass = section.background === "muted" ? "bg-muted/30" : "";
  const bgStyle =
    section.background === "tint" ? { backgroundColor: colorTint(accent, 0.08) }
    : section.background === "custom" && customBg ? { backgroundColor: customBg }
    : undefined;
  // Plain-text bodies need light text on a dark custom colour; cards keep their own white surface.
  const darkCustom = onDark && section.background === "custom";
  const darkBodyClass = darkCustom && ["richtext", "image-text", "faq", "timeline"].includes(section.type)
    ? "[&_p]:text-white/85 [&_h3]:text-white [&_button]:text-white"
    : "";
  const heading = (
    <SectionHeading title={section.title} subtitle={section.subtitle} icon={section.icon} badge={badge()} onDark={onDark} />
  );

  return (
    // overflow-wrap is inherited, so `anywhere` lets every descendant break a
    // long unbroken string instead of forcing the layout to scroll sideways.
    <section className={cn("py-14 md:py-20 [overflow-wrap:anywhere]", bgClass, darkCustom && "text-white")} style={bgStyle}>
      <div className="container mx-auto px-4">
        {section.background === "primary" ? (
          <div className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground md:p-12">
            {heading}
            {body}
          </div>
        ) : (
          <div className={darkBodyClass}>
            {heading}
            {body}
          </div>
        )}
      </div>
    </section>
  );
}

function CardTile({ item, onLink, badge }: { item: SectionItem; onLink: (link?: string) => void; badge: BadgeStyle }) {
  const Icon = resolveIcon(item.icon);
  const [open, setOpen] = useState(false);
  const detailed = hasDetail(item.description);
  const clickable = detailed || !!item.link;

  const activate = () => {
    if (detailed) setOpen(true);
    else if (item.link) onLink(item.link);
  };

  return (
    <>
      <Card
        className={cn(
          "group flex h-full flex-col overflow-hidden border-border/60 transition-shadow hover:shadow-xl",
          clickable && "cursor-pointer",
        )}
        onClick={clickable ? activate : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } } : undefined}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="p-6 pb-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={badge}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
        <CardContent className="flex flex-1 flex-col gap-2 p-6">
          {item.title && <h3 className="text-lg font-semibold">{item.title}</h3>}
          {item.description && <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>}
          {clickable && (
            <span className="mt-auto inline-flex items-center pt-1 text-sm font-medium text-primary">
              {detailed ? "Read more" : "Learn more"} <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </CardContent>
      </Card>
      {detailed && <ItemDetailDialog item={item} open={open} onOpenChange={setOpen} onLink={onLink} />}
    </>
  );
}

function TeamTile({ item, onLink }: { item: SectionItem; onLink: (link?: string) => void }) {
  const [open, setOpen] = useState(false);
  const detailed = hasDetail(item.description);

  return (
    <>
      <div
        className={cn("group text-center", detailed && "cursor-pointer")}
        onClick={detailed ? () => setOpen(true) : undefined}
        role={detailed ? "button" : undefined}
        tabIndex={detailed ? 0 : undefined}
        onKeyDown={detailed ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } } : undefined}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="mx-auto aspect-square w-full rounded-2xl object-cover" />
        ) : (
          <div className="mx-auto flex aspect-square w-full items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-10 w-10" />
          </div>
        )}
        {item.title && <h3 className="mt-3 font-semibold">{item.title}</h3>}
        {item.subtitle && <p className="text-sm text-primary">{item.subtitle}</p>}
        {item.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>}
        {detailed && (
          <span className="mt-1 inline-flex items-center text-sm font-medium text-primary">
            Read more <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
      {detailed && <ItemDetailDialog item={item} open={open} onOpenChange={setOpen} onLink={onLink} />}
    </>
  );
}

/** Full detail view for a card or team member whose text is too long for the tile. */
function ItemDetailDialog({
  item, open, onOpenChange, onLink,
}: {
  item: SectionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (link?: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Portaled outside the page wrapper, so it sets its own wrapping rule. */}
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto overflow-x-hidden p-0 [overflow-wrap:anywhere]">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title || ""} className="max-h-72 w-full object-cover" />
        )}
        <div className="min-w-0 space-y-4 p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-bold">{item.title || "Details"}</DialogTitle>
            {item.subtitle && (
              <DialogDescription className="text-sm font-medium text-primary">{item.subtitle}</DialogDescription>
            )}
          </DialogHeader>
          {(item.description || "").split(/\n\s*\n/).map((para, idx) => (
            <p key={idx} className="whitespace-pre-line leading-relaxed text-muted-foreground">{para}</p>
          ))}
          {item.link && (
            <Button className="rounded-full" onClick={() => onLink(item.link)}>
              Learn more <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentGrid({
  source, items, columns, navigate, onPlayVideo,
}: {
  source?: string;
  items: any[];
  columns?: number;
  navigate: (path: string) => void;
  onPlayVideo: (url: string) => void;
}) {
  switch (source) {
    case "news":
      return (
        <div className={`grid gap-6 ${colsClass(columns)}`}>
          {items.map((n) => (
            <Card key={n._id} className="group cursor-pointer overflow-hidden border-border/60 transition-shadow hover:shadow-xl" onClick={() => navigate(`/news/${n._id}`)}>
              {n.imageUrl ? (
                <img src={n.imageUrl} alt={n.title} className="h-44 w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-gradient-hero"><Sparkles className="h-12 w-12 text-primary-foreground/70" /></div>
              )}
              <CardContent className="space-y-2 p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {n.category && <Badge variant="outline" className="capitalize">{n.category.replace(/_/g, " ")}</Badge>}
                  {n.publishDate && <span>{new Date(n.publishDate).toLocaleDateString()}</span>}
                </div>
                <h3 className="text-lg font-semibold">{n.title}</h3>
                {n.description && <p className="line-clamp-3 text-sm text-muted-foreground">{n.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case "blogs":
      return (
        <div className={`grid gap-6 ${colsClass(columns)}`}>
          {items.map((b) => (
            <Card key={b._id} className="group cursor-pointer overflow-hidden border-border/60 transition-shadow hover:shadow-xl" onClick={() => navigate(`/blog/${b.slug}`)}>
              {b.coverImageUrl ? (
                <img src={b.coverImageUrl} alt={b.title} className="h-44 w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-gradient-hero"><Sparkles className="h-12 w-12 text-primary-foreground/70" /></div>
              )}
              <CardContent className="space-y-2 p-6">
                <div className="text-xs text-muted-foreground">{b.author}{b.publishDate ? ` · ${new Date(b.publishDate).toLocaleDateString()}` : ""}</div>
                <h3 className="text-lg font-semibold">{b.title}</h3>
                {b.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{b.excerpt}</p>}
                <span className="inline-flex items-center text-sm font-medium text-primary">Read more <ChevronRight className="h-4 w-4" /></span>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case "gallery":
      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <button key={a._id} onClick={() => navigate(`/gallery/${a._id}`)} className="group relative aspect-square overflow-hidden rounded-2xl bg-muted">
              {a.coverImageUrl ? (
                <img src={a.coverImageUrl} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-hero"><Sparkles className="h-10 w-10 text-primary-foreground/70" /></div>
              )}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium text-white">{a.title}{a.imageCount ? ` · ${a.imageCount}` : ""}</span>
              </div>
            </button>
          ))}
        </div>
      );

    case "videos":
      return (
        <div className={`grid gap-6 ${colsClass(columns)}`}>
          {items.map((v) => (
            <button key={v._id} onClick={() => onPlayVideo(v.videoUrl)} className="group overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm transition-shadow hover:shadow-xl">
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
      );

    case "projects":
      return (
        <div className={`grid gap-6 ${colsClass(columns)}`}>
          {items.map((p) => <ProjectCard key={p._id} project={p} />)}
        </div>
      );

    case "brochures":
      return (
        <div className={`grid gap-4 ${colsClass(columns)}`}>
          {items.map((br) => (
            <a key={br._id} href={br.fileUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{br.title}</h3>
                {br.description && <p className="line-clamp-1 text-sm text-muted-foreground">{br.description}</p>}
              </div>
              <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      );

    case "partners":
      return (
        <div className="flex flex-wrap items-center justify-center gap-8">
          {items.map((p) => (
            p.logoUrl ? (
              <a key={p._id} href={p.link || "#"} target="_blank" rel="noreferrer" className="grayscale transition hover:grayscale-0">
                <img src={p.logoUrl} alt={p.name} className="h-12 w-auto object-contain" />
              </a>
            ) : (
              <span key={p._id} className="text-sm font-medium text-muted-foreground">{p.name}</span>
            )
          ))}
        </div>
      );

    case "faqs":
      return (
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {items.map((f) => (
              <AccordionItem key={f._id} value={f._id}>
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    default:
      return null;
  }
}
