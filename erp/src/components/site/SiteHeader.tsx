import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu, X, Heart, HandHeart, User, LogIn, Phone, Mail, ArrowRight, ExternalLink, ChevronDown,
  Download, Search,
  Facebook, Instagram, Youtube, Twitter, Linkedin,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useConfig } from "@/contexts/ConfigContext";
import { usePublicPages } from "@/hooks/useSitePages";
import { useSiteData } from "@/hooks/useSiteData";
import {
  resolveNavigation, isActiveTarget,
  type NavigationSettings, type NavItem, type NavLink, type NavButton,
} from "@/types/siteNavigation";
import { SiteTheme } from "@/components/site/SiteTheme";
import { goToSiteTarget } from "@/lib/siteNav";
// The wordmark resolves through the franchise config so each franchise serves
// its own brand; BrandMark falls back to the bundled asset when a franchise
// has not uploaded one.
import { BrandMark } from "@/components/site/BrandMark";
import { cn } from "@/lib/utils";

const BUTTON_ICONS: Record<string, LucideIcon> = {
  heart: Heart, "hand-heart": HandHeart, user: User, "log-in": LogIn,
  phone: Phone, mail: Mail, "arrow-right": ArrowRight, external: ExternalLink,
};

// Where the link group sits between the logo and the action buttons.
const ALIGN_CLASS: Record<string, string> = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };

// Menu links are brand-green pills: filled on hover and on the page you are
// looking at, so the bar picks up the logo's green rather than a neutral grey.
const LINK_CLASS =
  "rounded-full px-3.5 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 " +
  "hover:bg-[hsl(var(--brand-green))] hover:text-white";
const LINK_ACTIVE_CLASS = "bg-[hsl(var(--brand-green))] text-white shadow-sm";

// Dropdown rows tint rather than fill, so the open panel stays readable while
// still reading as the same green family as the bar above it.
const MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground/80 " +
  "transition-colors hover:bg-[hsl(var(--brand-green))]/10 hover:text-[hsl(var(--brand-green-dark))]";
const MENU_ITEM_ACTIVE_CLASS = "bg-[hsl(var(--brand-green))]/10 font-medium text-[hsl(var(--brand-green-dark))]";

// Action buttons use the logo's greens rather than the site theme, so the
// header reads as the brand no matter which theme colour a franchise picks.
const BRAND_OUTLINE_CLASS =
  "border-[hsl(var(--brand-green))]/40 bg-[hsl(var(--brand-green))]/5 font-semibold text-[hsl(var(--brand-green))] " +
  "transition-colors hover:border-[hsl(var(--brand-green))] hover:bg-[hsl(var(--brand-green))]/10 hover:text-[hsl(var(--brand-green-dark))]";
const BRAND_SOLID_CLASS =
  "border-0 bg-[image:var(--gradient-brand)] font-semibold text-white shadow-md transition hover:brightness-110";

// Round icon button in the mobile app bar — one class so the three actions and
// the drawer trigger all present at the same tap size (44px from `sm`, 36px on
// the narrowest phones where three of them share a third of the bar).
const APP_ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-muted hover:text-foreground sm:h-11 sm:w-11";

/** Icon for a nav button that has none configured, so no button renders bare. */
function fallbackButtonIcon(b: NavButton): LucideIcon | undefined {
  if (b.kind === "donate") return HandHeart;
  const target = (b.target || "").toLowerCase();
  if (target.includes("login")) return LogIn;
  if (target.includes("contact")) return Mail;
  return undefined;
}
const HOME_LINK: NavLink = { label: "Home", kind: "home", target: "/" };
const LOGIN_LINK: NavLink = { label: "Login", kind: "builtin", target: "/login" };
// The mobile bar always offers a way to give, so it needs a target even when
// the admin has configured no payment link at all: the home page's donation
// band carries the QR and bank details, which is where a donor goes anyway.
const DONATE_LINK: NavLink = { label: "Donate", kind: "donate", target: "" };
const DONATE_SECTION_LINK: NavLink = { label: "Donate", kind: "section", target: "/#donate" };

/**
 * The synthetic dropdown that carries the menu's tail below `xl`.
 *
 * Built at render time rather than stored: it is a device for a narrow bar, not
 * something an admin configured, so it must never reach the saved navigation or
 * show up in the header builder.
 */
function moreItem(children: NavLink[]): NavItem {
  return { type: "dropdown", label: "More", kind: "custom", target: "", children, visible: true };
}

interface SiteHeaderProps {
  donateLink?: string;
  /** Override the stored config (used by the admin live preview). */
  navigation?: NavigationSettings;
  /** Inline, desktop-only, non-navigating rendering for the settings page. */
  preview?: boolean;
}

export function SiteHeader({ donateLink: donateLinkProp, navigation: navigationProp, preview = false }: SiteHeaderProps) {
  const { org } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: siteData } = useSiteData();
  const { data: publicPages } = usePublicPages();

  const settings = siteData?.settings;
  const donateLink = donateLinkProp ?? (settings?.donation?.paymentLink || settings?.hero?.ctaLink);
  const phone = settings?.contactDetails?.phone || org.phone;
  const email = settings?.contactDetails?.email || org.email;
  const firstBrochureUrl = siteData?.brochures?.[0]?.fileUrl;
  const { menuAlignment, items, buttons } = resolveNavigation(
    navigationProp ?? settings?.navigation,
    publicPages || [],
    donateLink,
  );

  // From `xl` up the bar has room for the whole menu. Below that the tail folds
  // into a "More" panel instead of wrapping onto a second line — see the nav.
  const INLINE_ITEM_LIMIT = 3;
  const inlineItems = items.slice(0, INLINE_ITEM_LIMIT);
  const overflowItems = items.slice(INLINE_ITEM_LIMIT);
  // A dropdown in the tail contributes its own links, because the panel renders
  // one flat list — there is no second level to render.
  const moreLinks: NavLink[] = overflowItems.flatMap((i) =>
    i.type === "dropdown" ? i.children || [] : [i],
  );

  /** One menu entry, wherever it ends up. */
  const renderNavItem = (item: NavItem, key: string) =>
    item.type === "dropdown" ? (
      <DesktopDropdown
        key={key}
        item={item}
        onGo={go}
        alignRight={menuAlignment === "right"}
        pathname={location.pathname}
      />
    ) : (
      <button
        key={key}
        onClick={() => go(item)}
        className={cn(LINK_CLASS, isActiveTarget(item.target, location.pathname) && LINK_ACTIVE_CLASS)}
        aria-current={isActiveTarget(item.target, location.pathname) ? "page" : undefined}
      >
        {item.label}
      </button>
    );

  // The mobile bar shows the two actions as icons rather than labelled pills,
  // so it needs the configured buttons themselves — a donate button carries the
  // admin's "open in new tab" choice, which a hardcoded link would drop.
  const donateButton = buttons.find((b) => b.kind === "donate");
  const loginButton = buttons.find(
    (b) => b.kind !== "donate" && (b.target || "").toLowerCase().includes("login"),
  );
  const donateAction = donateButton ?? (donateLink ? DONATE_LINK : DONATE_SECTION_LINK);

  const socials = useMemo(() => {
    const s = settings?.socialMedia || {};
    return [
      { url: s.facebook, Icon: Facebook, label: "Facebook" },
      { url: s.instagram, Icon: Instagram, label: "Instagram" },
      { url: s.youtube, Icon: Youtube, label: "YouTube" },
      { url: s.twitter, Icon: Twitter, label: "Twitter" },
      { url: s.linkedin, Icon: Linkedin, label: "LinkedIn" },
    ].filter((item): item is { url: string; Icon: LucideIcon; label: string } => !!item.url);
  }, [settings?.socialMedia]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ id: string; label: string; type: string; go: () => void }> = [];
    for (const p of siteData?.projects || []) {
      if (results.length >= 6) break;
      if (p.name?.toLowerCase().includes(q)) {
        const path = p.pageSlug ? `/projects-hub/${p.pageSlug}` : "/projects-hub";
        results.push({ id: p._id, label: p.name, type: "Project", go: () => navigate(path) });
      }
    }
    for (const sc of siteData?.schemes || []) {
      if (results.length >= 6) break;
      const label = sc.name || sc.title || "";
      if (label.toLowerCase().includes(q)) {
        results.push({ id: sc._id, label, type: "Scheme", go: () => navigate("/public-schemes") });
      }
    }
    for (const n of siteData?.news || []) {
      if (results.length >= 6) break;
      if (n.title?.toLowerCase().includes(q)) {
        results.push({ id: n._id, label: n.title, type: "News", go: () => navigate(`/news/${n._id}`) });
      }
    }
    return results;
  }, [searchQuery, siteData, navigate]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const go = (link: NavLink) => {
    if (preview) return;
    setDrawerOpen(false);
    closeSearch();
    goToSiteTarget(
      navigate,
      location.pathname,
      link.kind === "donate" ? donateLink : link.target,
      link.openInNewTab,
    );
  };

  /** Desktop-bar action button. The mobile bar renders its own icon-only pair. */
  const renderButton = (b: NavButton, i: number) => {
    const isDonate = b.kind === "donate";
    const Icon = BUTTON_ICONS[b.icon] || fallbackButtonIcon(b);
    return (
      <Button
        key={b._id || i}
        variant={b.style === "outline" ? "outline" : "default"}
        className={cn(
          "inline-flex rounded-full",
          isDonate && "bg-[hsl(var(--warning))] text-white shadow-glow hover:bg-[hsl(var(--warning))]/90",
          !isDonate && b.style === "outline" && BRAND_OUTLINE_CLASS,
          !isDonate && b.style !== "outline" && BRAND_SOLID_CLASS,
        )}
        onClick={() => go(b)}
      >
        {Icon && <Icon className="mr-1.5 h-4 w-4" />}
        {b.label}
      </Button>
    );
  };

  const searchPanel = (
    <>
      <input
        autoFocus
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search projects, schemes, news…"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {searchQuery.trim() && (
        <div className="mt-2 max-h-72 overflow-y-auto">
          {searchResults.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No results found.</p>
          ) : (
            searchResults.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => { r.go(); closeSearch(); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </>
  );

  return (
    <header
      className={cn(
        preview
          ? "relative rounded-xl border border-border/60 bg-background shadow-sm"
          : "sticky top-0 z-50 bg-background shadow-sm",
      )}
    >
      {!preview && (
        <SiteTheme primary={settings?.appearance?.primaryColor} gradient={settings?.appearance?.gradientColor} />
      )}

      {/* Top utility bar. Desktop only: below `lg` the site runs as an app
          shell, where these details live in the drawer instead. */}
      {!preview && (phone || email || firstBrochureUrl) && (
        <div className="hidden bg-gradient-hero text-primary-foreground lg:block">
          <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-1.5 text-xs">
            <div className="flex items-center gap-4">
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-1.5 opacity-90 hover:opacity-100">
                  <Phone className="h-3 w-3" /> {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="hidden items-center gap-1.5 opacity-90 hover:opacity-100 md:flex">
                  <Mail className="h-3 w-3" /> {email}
                </a>
              )}
            </div>
            <div className="flex items-center gap-4">
              {firstBrochureUrl && (
                <a href={firstBrochureUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 opacity-90 hover:opacity-100">
                  <Download className="h-3 w-3" /> Download Brochure
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile app bar: drawer · logo · actions ──────────────────────── */}
      {!preview && (
        <div className="border-b border-border/40 lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-1 px-2 py-1.5">
            <button
              className={APP_ICON_CLASS}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* The wordmark sits beside the drawer button and takes whatever
                the actions leave: min-w-0 lets the flex item shrink and
                object-contain scales the logo into it instead of clipping. */}
            <button
              onClick={() => go(HOME_LINK)}
              className="flex min-w-0 flex-1 justify-start"
              aria-label={org.displayName || org.erpTitle}
            >
              <BrandMark className="h-10 w-auto max-w-full object-contain" />
              <h1 className="sr-only">{org.displayName || org.erpTitle}</h1>
            </button>

            <div className="flex shrink-0 items-center">
              <button
                className={APP_ICON_CLASS}
                onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                aria-label="Search"
                aria-expanded={searchOpen}
              >
                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>

              <button
                className={APP_ICON_CLASS}
                onClick={() => go(loginButton || LOGIN_LINK)}
                aria-label={loginButton?.label || "Login"}
              >
                <LogIn className="h-5 w-5" />
              </button>

              <button
                className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--warning))] text-white shadow-glow transition hover:bg-[hsl(var(--warning))]/90 sm:h-10 sm:w-10"
                onClick={() => go(donateAction)}
                aria-label={donateAction.label}
              >
                <HandHeart className="h-5 w-5" />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="border-t border-border/40 bg-background px-3 py-3">{searchPanel}</div>
          )}
        </div>
      )}

      {/* ── Desktop bar ──────────────────────────────────────────────────── */}
      <div className={cn("border-b border-border/40 py-3", preview ? "block" : "hidden lg:block")}>
        <div className="container mx-auto flex items-center justify-between gap-4 px-4">
          <button onClick={() => go(HOME_LINK)} className="flex shrink-0 items-center gap-3">
            <BrandMark className="h-12 w-auto shrink-0 object-contain md:h-14 lg:h-16" />
            {/* The logo is a wordmark carrying the org name, so showing it
                again beside the mark duplicated the branding. Kept for
                screen readers and as the page heading. */}
            <h1 className="sr-only">{org.displayName || org.erpTitle}</h1>
          </button>

          {/* `flex-nowrap`, because the previous `flex-wrap` is what turned a
              tight bar into a broken one: between `lg` and `xl` the row carries
              the logo, the menu and the actions in about 1000px, and the menu
              answered by dropping its last link onto a second line and growing
              the whole header instead of giving anything up. */}
          <nav className={cn("flex flex-nowrap items-center gap-1", ALIGN_CLASS[menuAlignment])}>
            {inlineItems.map((item, i) => renderNavItem(item, item._id || `inline-${i}`))}
            {overflowItems.length > 0 && (
              <div className="hidden items-center gap-1 xl:flex">
                {overflowItems.map((item, i) => renderNavItem(item, item._id || `wide-${i}`))}
              </div>
            )}
            {moreLinks.length > 0 && (
              <div className="flex xl:hidden">
                <DesktopDropdown
                  item={moreItem(moreLinks)}
                  onGo={go}
                  alignRight={menuAlignment === "right"}
                  pathname={location.pathname}
                />
              </div>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {!preview && (
              <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSearchOpen(false); }}>
                <button
                  // Same outlined circle as the calculator beside it. The search
                  // used to be a bare padded glyph in grey, which sat next to a
                  // bordered brand-green button as though the two belonged to
                  // different toolbars.
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    BRAND_OUTLINE_CLASS,
                  )}
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label="Search"
                  aria-expanded={searchOpen}
                >
                  <Search className="h-5 w-5" />
                </button>
                {searchOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border/60 bg-background p-2 shadow-xl">
                    {searchPanel}
                  </div>
                )}
              </div>
            )}
            {/* No calculator here. It was a third circular control sitting
                between the search and Donate, and it competed with the two
                buttons that actually move a visitor on — the hero carries a
                "Calculate Zakat" call to action, and below `lg` the tab bar
                keeps a Calculator tab. Baithuzzakath floats it instead of
                dropping it, from the opposite corner (see ZakatFab). */}
            {buttons.map((b, i) => renderButton(b, i))}
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {!preview && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="flex w-[72%] max-w-[17rem] flex-col gap-0 p-0 lg:hidden">
            <SheetTitle className="sr-only">Menu</SheetTitle>

            <div className="flex items-center border-b border-border/50 px-4 py-3">
              <BrandMark className="h-11 w-auto max-w-[70%] object-contain" />
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="flex flex-col gap-1">
                {items.map((item, i) =>
                  item.type === "dropdown" ? (
                    <div key={item._id || i}>
                      <button
                        onClick={() => setOpenGroups((g) => ({ ...g, [i]: !g[i] }))}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground/80 hover:bg-muted"
                        aria-expanded={!!openGroups[i]}
                      >
                        {item.label}
                        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", openGroups[i] && "rotate-180")} />
                      </button>
                      {openGroups[i] && (
                        <div className="ml-3 flex flex-col gap-1 border-l border-border/60 pl-2">
                          {(item.children || []).map((c, j) => (
                            <button
                              key={c._id || j}
                              onClick={() => go(c)}
                              className="rounded-xl px-3 py-2.5 text-left text-sm text-foreground/70 hover:bg-muted"
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      key={item._id || i}
                      onClick={() => go(item)}
                      className="rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground/80 hover:bg-muted"
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>

              {/* Links and socials only. Calculate Zakat and Login already sit
                  in the bottom tab bar and the app bar's icons, and repeating
                  them here made the drawer a second copy of both. */}
              {socials.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 px-3 pt-4">
                  {socials.map(({ url, Icon, label }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/70 transition-colors hover:bg-[hsl(var(--brand-green))] hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}

/** Hover / focus / click-opened dropdown for the desktop bar. */
function DesktopDropdown({
  item, onGo, alignRight, pathname,
}: { item: NavItem; onGo: (l: NavLink) => void; alignRight: boolean; pathname: string }) {
  const [clicked, setClicked] = useState(false);
  // A group whose page you are on keeps its pill filled, so the bar still says
  // where you are while the panel itself is closed.
  const groupActive = (item.children || []).some((c) => isActiveTarget(c.target, pathname));

  return (
    <div
      className="group relative"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setClicked(false); }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={clicked}
        onClick={() => setClicked((v) => !v)}
        className={cn(
          LINK_CLASS,
          "inline-flex items-center gap-1 group-hover:bg-[hsl(var(--brand-green))] group-hover:text-white",
          (groupActive || clicked) && LINK_ACTIVE_CLASS,
        )}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180",
            clicked && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "invisible absolute top-full z-50 min-w-[230px] translate-y-1 pt-3 opacity-0 transition-all duration-200",
          "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
          "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
          clicked && "visible translate-y-0 opacity-100",
          alignRight ? "right-0" : "left-0",
        )}
      >
        {/* Caret tying the panel to its pill. Green rather than white so it
            continues the panel's brand cap instead of breaking it. */}
        <div
          className={cn(
            "absolute top-[7px] h-3 w-3 rotate-45 rounded-[2px] bg-[hsl(var(--brand-green))]",
            alignRight ? "right-6" : "left-6",
          )}
        />
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background p-1.5 shadow-xl">
          {/* Green cap: the panel belongs to the green pill it hangs from. */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[image:var(--gradient-brand)]" />
          {(item.children || []).map((c, j) => (
            <button
              key={c._id || j}
              type="button"
              onClick={() => { setClicked(false); onGo(c); }}
              className={cn(MENU_ITEM_CLASS, isActiveTarget(c.target, pathname) && MENU_ITEM_ACTIVE_CLASS)}
              aria-current={isActiveTarget(c.target, pathname) ? "page" : undefined}
            >
              <span>{c.label}</span>
              {c.openInNewTab && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
