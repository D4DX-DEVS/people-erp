import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, ArrowRight, Sparkles, Loader2,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VolunteerDialog } from "@/components/site/VolunteerDialog";
import { useConfig } from "@/contexts/ConfigContext";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BackToTop } from "@/components/site/BackToTop";
import { ZakatFab } from "@/components/site/ZakatFab";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { HeroSlider } from "@/components/site/HeroSlider";
import { useSiteData, getYouTubeId, videoThumb } from "@/hooks/useSiteData";
import { resolveIcon } from "@/lib/siteIcons";
import { ProjectsShowcase } from "@/components/site/ProjectsShowcase";
import { ContentRail } from "@/components/site/ContentRail";
import { VideoRow } from "@/components/site/VideoRow";
import { ZakatCalculator } from "@/components/site/ZakatCalculator";
import { AnimatedCounter } from "@/components/site/AnimatedCounter";
import { Reveal } from "@/components/site/Reveal";
import { AnimatedTitle } from "@/components/site/AnimatedTitle";
import { SchemesStack } from "@/components/site/SchemesStack";
import { AssociatesMarquee } from "@/components/site/AssociatesMarquee";
import { VolunteerDonateBand } from "@/components/site/VolunteerDonateBand";
import { resolveDonationDefaults } from "@/config/donationDefaults";
import { iconBadgeStyle } from "@/lib/siteColors";
import { resolveHomeLayout, isHomeSectionVisible, type HomeSectionKey } from "@/types/siteHome";
import { usesFloatingZakatButton } from "@/config/orgFeatures";
import { schemePath } from "@/lib/siteSchemes";
import { cn } from "@/lib/utils";

const iconFor = (name?: string) => resolveIcon(name);

// Scheme category → icon and colour now live in config/schemeThemes.ts, keyed
// by category so a card's colour no longer depends on its position in the list.

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  accentFrom,
  divider = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Colour the title's trailing words from this word index onward.
   *  Defaults to the final word, which is the house style for every section
   *  heading on this page — pass an explicit index only to accent more. */
  accentFrom?: number;
  divider?: boolean;
}) {
  const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
  // A one-word title accents nothing: colouring the whole heading loses the
  // two-tone effect and just reads as a differently coloured heading.
  const resolvedAccent = accentFrom ?? (wordCount > 1 ? wordCount - 1 : undefined);

  return (
    <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-10">
      {eyebrow && (
        <Reveal as="span" className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </Reveal>
      )}
      <AnimatedTitle as="h2" text={title} delay={90} accentFrom={resolvedAccent} className="text-2xl font-bold md:text-4xl" />
      {subtitle && (
        <Reveal as="p" delay={180} className="mt-3 text-muted-foreground">
          {subtitle}
        </Reveal>
      )}
      {divider && (
        <Reveal delay={240} className="mt-4">
          <div aria-hidden className="flex items-center justify-center gap-2">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="h-1.5 w-1.5 rotate-45 bg-primary/60" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </Reveal>
      )}
    </div>
  );
}

export default function SiteHome() {
  const navigate = useNavigate();
  const { org } = useConfig();
  const { data, isLoading } = useSiteData();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const s = data?.settings || {};
  const banners = data?.banners || [];
  const counts = s.counts || [];
  const values = s.values || [];
  const projects = data?.projects || [];
  const schemes = data?.schemes || [];
  const news = data?.news || [];
  const blogs = data?.blogs || [];
  const gallery = data?.gallery || [];
  const videos = data?.videos || [];
  const partners = data?.partners || [];
  const faqs = data?.faqs || [];
  const mediaItems = data?.media || [];
  const donation = s.donation || {};
  const donateLink = donation.paymentLink || s.hero?.ctaLink;

  // Donate card content: whatever the admin saved under Website Settings →
  // Donation wins; the org's built-in defaults only fill the gaps. Legacy
  // settings held one account in flat fields, so fold those into the list when
  // no bankAccounts array is present.
  const orgDonationDefaults = resolveDonationDefaults(org.key);
  const legacyAccount = donation.accountNumber
    ? [{
        accountName: donation.accountName,
        accountNumber: donation.accountNumber,
        bankName: donation.bankName,
        ifsc: donation.ifsc,
      }]
    : [];
  const donateContent = {
    qrImageUrl: donation.qrImageUrl || orgDonationDefaults.qrImageUrl,
    accounts: donation.bankAccounts?.length
      ? donation.bankAccounts
      : legacyAccount.length
        ? legacyAccount
        : orgDonationDefaults.accounts,
    // Finance contacts, not the general office ones: transfer proof goes to a
    // different desk than enquiries, so contactDetails is only the last resort.
    whatsapp: orgDonationDefaults.whatsapp || s.contactDetails?.whatsapp,
    email: orgDonationDefaults.email || s.contactDetails?.email,
  };
  // Associate logos come solely from Partners in the admin, which stores name,
  // uploaded logo and link. No bundled fallback: like every other section, the
  // band simply does not render when there is nothing to show.
  // A "#" link is the admin's placeholder for "no website", so drop it rather
  // than wrapping the logo in an anchor that goes nowhere.
  const associateLogos = partners
    .filter((p) => p.logoUrl)
    .map((p) => ({
      name: p.name,
      src: p.logoUrl as string,
      href: p.link && p.link !== "#" ? p.link : undefined,
    }));
  const VisionIcon = resolveIcon(s.vision?.icon || "eye");
  const MissionIcon = resolveIcon(s.mission?.icon || "target");
  // Volunteer sign-up lives in a modal (see VolunteerDialog). The #volunteer
  // hash opens it too, so the footer and nav links still land somewhere real
  // now that the old inline form section is gone.
  const [volunteerOpen, setVolunteerOpen] = useState(false);
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#volunteer") setVolunteerOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const layout = resolveHomeLayout(s.homeLayout).filter((item) => item.visible);

  // Home sections, rendered in the order chosen in Website Settings → Home Page Layout.
  const renderers: Record<HomeSectionKey, () => ReactNode> = {
    counters: () => counts.length > 0 && (
        <section className="relative z-10 -mt-8 px-3 pb-10 sm:-mt-14 sm:px-4 sm:pb-14">
          {/* Brand-green gradient plate — colours sampled from the org logo
              (see --gradient-brand in index.css) — so the stats band reads as a
              deliberate break between the hero and the sections below it. */}
          <div className="container relative mx-auto overflow-hidden rounded-3xl border border-white/10 bg-[image:var(--gradient-brand)] p-4 shadow-2xl sm:p-8">
            {/* Colour blooms behind the cards. They exist so the cards'
                backdrop-blur has something to refract — blurring a flat
                gradient reads as nothing at all. */}
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[hsl(var(--brand-lime))]/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[hsl(var(--brand-lime))]/15 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

            {/* flex-wrap + justify-center (not grid) so an incomplete last
                row centers itself instead of hugging the left edge. Cards go
                full width under 400px: two-up there left a ~50px well for the
                figure, which clipped any count past four digits. */}
            <div className="relative flex flex-wrap justify-center gap-3 sm:gap-4">
              {counts.map((c, i) => {
                const Icon = iconFor(c.icon);
                return (
                  <div
                    key={c._id || i}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-lg shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/20 min-[400px]:w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.667rem)] sm:p-4 lg:w-[calc(25%-0.75rem)]"
                  >
                    {/* Lime from the logo — the admin-picked pastel tints used
                        elsewhere disappear against the dark green plate. */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-[hsl(var(--brand-lime))] transition-colors group-hover:bg-white/25 sm:h-11 sm:w-11">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold text-white sm:text-xl">
                        <AnimatedCounter value={c.count} />
                      </div>
                      <div className="truncate text-xs text-white/70">{c.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ),
    about: () => (
      <section id="about" className="scroll-mt-20 py-6">
        {/* The band used to carry four jobs at once — lead copy, artwork, the
            vision/mission pair, four value panels and the QR donate card — in a
            column that only split in three at `lg`. On a laptop panel or a
            phone that stacked into roughly three screens of scrolling, so the
            section never arrived as a whole. The donate panel now lives in the
            Donate section with the rest of the giving details. */}
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-6 sm:grid-cols-[1.05fr_0.95fr] sm:gap-10">
          <div className="space-y-4">
            <Reveal as="span" className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              About Us
            </Reveal>
            <AnimatedTitle
              as="h2"
              delay={90}
              className="font-display text-[32px] font-normal leading-[1.05] tracking-[-1.1px] sm:text-[38px] sm:leading-[38px]"
              text={s.aboutUs?.title || `About ${org.displayName || org.erpTitle}`}
            />
            <Reveal as="p" delay={180} className="font-site text-[18px] leading-[1.6] text-[#505256] lg:text-[22px] lg:leading-[33px]">
              {s.aboutUs?.description || org.aboutText || org.tagline}
            </Reveal>
            <Reveal delay={260} className="flex flex-wrap gap-3 pt-1">
              <Button className="rounded-full" onClick={() => navigate("/p/about-us")}>
                Learn More <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href="#donate">Donate Now</a>
              </Button>
            </Reveal>
          </div>

          <div className="relative">
            {s.aboutUs?.imageUrl ? (
              <img loading="lazy" decoding="async" src={s.aboutUs.imageUrl} alt="about" className="aspect-[16/11] w-full rounded-3xl object-cover shadow-xl" />
            ) : (
              <div className="flex aspect-[16/11] w-full items-center justify-center rounded-3xl bg-gradient-hero">
                <Sprout className="h-16 w-16 text-primary-foreground/70" />
              </div>
            )}
            {/* White with a soft cast shadow: the accent colour it used to be
                was unreadable once a photo (or the blue fallback panel) sat
                behind it. */}
            <p className="pointer-events-none absolute right-4 top-5 max-w-[7rem] font-serif text-sm italic leading-snug text-white [text-shadow:0_1px_10px_rgba(2,20,35,0.75)]">
              Small Contributions, Big Changes
            </p>
          </div>
          </div>

          {/* Vision + Mission: one short pair rather than two tall cards. The
              icon sits beside the text so each block stays two or three lines. */}
          {(s.vision?.description || s.mission?.description) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { key: "vision", Icon: VisionIcon, title: s.vision?.title || "Our Vision", body: s.vision?.description, color: s.vision?.color },
                { key: "mission", Icon: MissionIcon, title: s.mission?.title || "Our Mission", body: s.mission?.description, color: s.mission?.color },
              ].filter((x) => x.body).map((x, i) => (
                <Reveal key={x.key} delay={i * 100} className="h-full">
                  <Card className="h-full border-border/60">
                    <CardContent className="flex gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={iconBadgeStyle(x.color)}>
                        <x.Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">{x.title}</h3>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">{x.body}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}

          {/* Values, in the live site's "Our Impacts" treatment: an icon, a large
              accent-coloured figure and a label, held apart by hairlines instead
              of boxed into cards. Lifted onto the same warm accent the display
              headings already use for their second half, so the strip reads as
              part of this palette rather than a transplant.

              Two per row on the narrowest screen — one per row put four tall
              columns under everything else and doubled the band. */}
          {values.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-y-10 lg:grid-cols-4 lg:gap-y-0">
              {values.map((v, i) => {
                const Icon = iconFor(v.icon);
                return (
                  <Reveal
                    key={i}
                    delay={i * 80}
                    className="h-full border-[#D7D7D7] px-5 lg:border-r lg:last:border-r-0"
                  >
                    {/* A fixed gap rather than justify-between. The reference
                        pins its figure to the foot of the column, but that only
                        lines the four figures up because its blocks are all the
                        same height — ours carry descriptions of different
                        lengths, and bottom-anchoring them left the figures
                        stepping up and down across the row. */}
                    <div className="flex h-full flex-col gap-10 lg:gap-24">
                      <Icon className="h-11 w-11 text-[hsl(var(--warning))]" strokeWidth={1.5} />
                      <div>
                        <span className="block font-site text-[52px] font-medium leading-none text-[hsl(var(--warning))] lg:text-[60px]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="mt-3 font-site text-[24px] font-medium leading-tight text-[#010101] lg:text-[27px]">
                          {v.title}
                        </h3>
                        <p className="mt-1.5 font-site text-[14px] leading-snug text-muted-foreground">{v.description}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    ),
    projects: () => projects.length > 0 && (
        <section id="projects" className="scroll-mt-20 bg-muted/60 py-5">
          <div className="container mx-auto px-4">
            <SectionHeading eyebrow="Zakat in Action" title="Our Projects" subtitle="Real support for real lives. Explore our key initiatives." />
            <ProjectsShowcase projects={projects} />
            <div className="mt-6 text-center sm:mt-10">
              <Button variant="outline" className="rounded-full" onClick={() => navigate("/projects-hub")}>
                View all projects <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      ),
    schemes: () => schemes.length > 0 && (
        <section id="schemes" className="relative scroll-mt-20 overflow-hidden bg-[hsl(var(--secondary)/0.12)] py-5">
          <div className="container relative mx-auto px-4">
            <SchemesStack
              schemes={schemes}
              onOpen={(sc) => navigate(schemePath(sc))}
              onViewAll={() => navigate("/schemes")}
            />
          </div>
        </section>
      ),
    calculator: () => (
      <section id="calculator" className="relative scroll-mt-20 overflow-hidden bg-[hsl(var(--brand-green))]/[0.04] pb-4 pt-6 sm:pb-6 sm:pt-10">
        {/* Decorative arabesque wash, matching the other branded bands. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Sparkles className="absolute -left-10 top-8 h-64 w-64 text-primary/[0.04]" />
          <Sprout className="absolute -right-12 bottom-0 h-72 w-72 text-primary/[0.05]" />
        </div>
        <div className="container relative mx-auto px-4">
          <SectionHeading eyebrow="Zakat Calculator" title="Calculate Your Zakat" subtitle="Know your Zakat obligation in just a few simple steps." />
          <ZakatCalculator />
        </div>
      </section>
    ),
    news: () => news.length > 0 && (
        <section id="news" className="scroll-mt-20 py-5">
          <div className="container mx-auto px-4">
            {/* Copy and layout follow the organisation's own marketing site. */}
            <ContentRail
              heading="What we’ve been up to lately"
              onOpen={(id) => navigate(`/news/${id}`)}
              items={news.slice(0, 6).map((n) => ({
                _id: n._id,
                title: n.title,
                imageUrl: n.imageUrl,
                eyebrow: (n.category || "news").replace(/_/g, " "),
                meta: n.publishDate
                  ? new Date(n.publishDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "",
                byline: `By ${org.displayName || "People's Foundation"}`,
                excerpt: n.description,
              }))}
            />
            <div className="mt-8 text-center">
              <Button variant="outline" className="rounded-full" onClick={() => navigate("/news")}>
                View all news & events <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      ),
    gallery: () => gallery.length > 0 && (
        <section id="gallery" className="scroll-mt-20 bg-gray-50 py-8 sm:py-10">
          <div className="container mx-auto px-4">
            {gallery.length > 0 && (
              <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">Gallery</span>
                    <h3 className="text-lg font-bold">Moments That Matter</h3>
                  </div>
                  {/* The noun drops out on narrow screens: the full label left
                      the heading beside it barely 100px to wrap into. */}
                  <Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => navigate("/gallery")}>
                    View all<span className="hidden sm:inline">&nbsp;photos</span> <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {gallery.slice(0, 3).map((a, i) => (
                    <Reveal key={a._id} delay={i * 100} className="min-w-0">
                      <button
                        onClick={() => navigate(`/gallery/${a._id}`)}
                        className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-muted"
                      >
                        {a.coverImageUrl ? (
                          <img loading="lazy" decoding="async" src={a.coverImageUrl} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-hero"><Sparkles className="h-6 w-6 text-primary-foreground/70" /></div>
                        )}
                        {/* Album title on hover — three larger tiles have room for
                            it where four small ones did not. */}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {a.title}
                        </span>
                      </button>
                    </Reveal>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      ),
    videos: () => videos.length > 0 && (
        <section id="videos" className="scroll-mt-20 py-8 sm:py-10">
          <div className="container mx-auto px-4">
            <VideoRow
              videos={videos.map((v) => ({
                _id: v._id,
                title: v.title,
                videoUrl: v.videoUrl,
                thumbnailUrl: videoThumb(v.videoUrl, v.thumbnailUrl),
              }))}
              channelName={org.displayName || "People's Foundation"}
              onPlay={(url) => setActiveVideo(url)}
              onExplore={() => navigate("/videos")}
            />
          </div>
        </section>
      ),
    blogs: () => blogs.length > 0 && (
        <section id="blogs" className="scroll-mt-20 py-8 sm:py-10">
          <div className="container mx-auto px-4">
            {/* Same card as the news band, matching the marketing site. */}
            <ContentRail
              heading="Blogs"
              onOpen={(slug) => navigate(`/blog/${slug}`)}
              items={blogs.slice(0, 6).map((b) => ({
                _id: b.slug,
                title: b.title,
                imageUrl: b.coverImageUrl,
                eyebrow: (b.category || "general").replace(/_/g, " "),
                meta: b.publishDate
                  ? new Date(b.publishDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "",
                byline: b.author ? `By ${b.author}` : undefined,
              }))}
            />
            <div className="mt-8 text-center">
              <Button variant="outline" className="rounded-full" onClick={() => navigate("/blogs")}>
                View all posts <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      ),
    media: () => mediaItems.length > 0 && (
        <section className="py-5">
          <div className="container mx-auto px-4">
            <SectionHeading eyebrow="In the news" title="Media Coverage" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {mediaItems.map((m, i) => (
                <Reveal key={m._id} delay={i * 80} className="h-full">
                  <a href={m.link || "#"} target="_blank" rel="noreferrer"
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    {m.imageUrl && <img loading="lazy" decoding="async" src={m.imageUrl} alt={m.title} className="h-36 w-full object-cover" />}
                    <div className="space-y-1 p-4">
                      {m.source && <span className="text-xs font-medium uppercase tracking-wide text-primary">{m.source}</span>}
                      <h3 className="line-clamp-2 text-sm font-semibold">{m.title}</h3>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ),
    donation: () => (
      <section id="donate" className="scroll-mt-20 py-5">
        <div className="container mx-auto px-4">
          <VolunteerDonateBand
            heading={donation.heading}
            description={donation.description}
            paymentLink={donation.paymentLink}
            onVolunteer={() => setVolunteerOpen(true)}
          />
          {donation.enabled && (donation.accountName || donation.accountNumber || donation.bankName) && (
            /* The QR moved here from the About band: it belongs beside the
               account details, and its white plate was most of what made About
               three screens tall. */
            <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-border/50 bg-card p-5 text-sm shadow-sm sm:flex-row sm:items-center">
              {donateContent.qrImageUrl && (
                <img
                  src={donateContent.qrImageUrl}
                  alt="Scan to donate"
                  loading="lazy"
                  decoding="async"
                  className="mx-auto h-32 w-32 shrink-0 rounded-xl bg-white object-contain p-1.5 shadow-sm sm:mx-0"
                />
              )}
              <div className="grid flex-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {donation.accountName && <Row label="Account Name" value={donation.accountName} />}
                {donation.accountNumber && <Row label="Account No." value={donation.accountNumber} />}
                {donation.bankName && <Row label="Bank" value={donation.bankName} />}
                {donation.ifsc && <Row label="IFSC" value={donation.ifsc} />}
                {donation.upiId && <Row label="UPI ID" value={donation.upiId} />}
              </div>
            </div>
          )}
        </div>
      </section>
    ),
    // The single logo band, just above the footer. It replaced a second,
    // near-identical "Our Associates & Partners" strip that read the same
    // Partners records — two sections showing one dataset.
    associates: () => associateLogos.length > 0 && (
      <section className="border-t border-border/40 py-8 sm:py-12">
        {/* Strip shares the page container with the heading — it used to be
            full-bleed, which made it wider than every other section. */}
        <div className="container mx-auto px-4">
          {/* Title and supporting line as a centred pair rather than the eyebrow
              + centred heading the other sections use: this band is ported from
              the live site, where the pair is what sets the two drifting rows
              apart from the sections above. */}
          {/* Wider than the live site's pair: that one heads with "Our
              Associates", and our longer "Associates & Partners" wraps to two
              lines in a 320px column. */}
          <div className="mx-auto grid max-w-[735px] gap-3 pb-8 sm:pb-10 lg:grid-cols-[380px_335px] lg:gap-5">
            <AnimatedTitle
              as="h2"
              className="font-display text-[32px] font-normal leading-[1.05] tracking-[-1.1px] sm:text-[38px] sm:leading-[38px]"
              text="Associates & Partners"
            />
            <Reveal as="p" delay={120} className="font-site text-[18px] leading-[1.6] text-[#505256] lg:text-[22px] lg:leading-[33px]">
              Working together with organisations that share our purpose.
            </Reveal>
          </div>
          <AssociatesMarquee logos={associateLogos} />
        </div>
      </section>
    ),
    faq: () => faqs.length > 0 && (
        <section id="faq" className="scroll-mt-20 py-5">
          <div className="container mx-auto max-w-3xl px-4">
            <SectionHeading eyebrow="Help" title="Frequently Asked Questions" />
            <Reveal delay={80}>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((f) => (
                  <AccordionItem key={f._id} value={f._id}>
                    <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>
      ),
  };

  return (
    <div className="site-font min-h-screen bg-background">
      <ScrollProgress />
      <SiteHeader donateLink={donateLink} />

      {/* STICKY HERO — pinned via .site-hero (position: sticky); the
          .site-page-body sibling below slides up and covers it. Pure CSS. */}
      <section className="site-hero" aria-label="Highlights">
        <HeroSlider banners={banners} hero={{ ...s.hero, ctaText: s.hero?.ctaText || "Donate Now", ctaLink: s.hero?.ctaLink || donateLink }} />
      </section>

      {/* COVERING SHEET — relative + higher z-index + opaque background is
          what makes it visually slide over the pinned hero. */}
      <div className="site-page-body">
        {layout.map(({ key }) => {
          // Several renderers return false when they have no content — skip the
          // reveal wrapper entirely rather than leaving an empty hidden div.
          const section = renderers[key]();
          return section ? <Reveal key={key}>{section}</Reveal> : null;
        })}

        <SiteFooter settings={s} />
      </div>

      <MobileBottomNav />
      <BackToTop />
      {/* The home page renders its own chrome rather than going through
          SiteShell, so the floating shortcut has to be mounted here too. */}
      {isHomeSectionVisible(s.homeLayout, "calculator") && usesFloatingZakatButton(org.key) && <ZakatFab />}

      {/* Video lightbox */}
      <VolunteerDialog open={volunteerOpen} onOpenChange={setVolunteerOpen} />

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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  // Tuned for the light card these sit on: the label used to be
  // `text-primary-foreground/75` and the rule `border-white/15`, both of which
  // are near-white — so every label rendered invisible against the panel.
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
