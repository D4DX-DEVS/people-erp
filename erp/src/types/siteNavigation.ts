// Shared types + helpers for the customizable public-site header
// (stored as WebsiteSettings.navigation in the API).
import type { SitePageSummary } from "@/types/sitePage";

export type NavLinkKind = "home" | "section" | "builtin" | "page" | "donate" | "custom";

export interface NavLink {
  _id?: string;
  label: string;
  kind: NavLinkKind;
  /** Path, "/#anchor" or full URL. Empty for `donate` (resolved from Donation settings at render time). */
  target: string;
  openInNewTab?: boolean;
  visible?: boolean;
  order?: number;
}

export interface NavItem extends NavLink {
  type: "link" | "dropdown";
  /** Only used when `type` is "dropdown". */
  children?: NavLink[];
  /** UI-only: row expanded in the builder. Stripped before save. */
  _expanded?: boolean;
}

export type NavButtonStyle = "primary" | "outline";

export interface NavButton extends NavLink {
  style: NavButtonStyle;
  /** One of BUTTON_ICONS, or "" for no icon. */
  icon: string;
  /** UI-only: row expanded in the builder. Stripped before save. */
  _expanded?: boolean;
}

export type MenuAlignment = "left" | "center" | "right";

export interface NavigationSettings {
  /** false = automatic menu: built-in links + every published page marked "show in menu". */
  customized: boolean;
  menuAlignment: MenuAlignment;
  items: NavItem[];
  buttons: NavButton[];
}

export interface NavDestination {
  value: string;
  kind: NavLinkKind;
  /** Friendly name shown in the destination picker. */
  label: string;
  /** Default menu label when the admin hasn't typed one. */
  short: string;
}

/** Everything a link can point to besides custom pages and free-form URLs. */
export const DESTINATION_GROUPS: Array<{ label: string; options: NavDestination[] }> = [
  {
    label: "Home page",
    options: [
      { value: "/", kind: "home", label: "Home", short: "Home" },
      { value: "/#about", kind: "section", label: "About us section", short: "About" },
      { value: "/#pages", kind: "section", label: "Our pages overview section", short: "Explore" },
      { value: "/#projects", kind: "section", label: "Projects section", short: "Projects" },
      { value: "/#news", kind: "section", label: "News section", short: "News" },
      { value: "/#gallery", kind: "section", label: "Gallery section", short: "Gallery" },
      { value: "/#videos", kind: "section", label: "Videos section", short: "Videos" },
      { value: "/#faq", kind: "section", label: "FAQ section", short: "FAQ" },
      { value: "/p/contact-us", kind: "page", label: "Contact page", short: "Contact" },
    ],
  },
  {
    label: "Website pages",
    options: [
      { value: "/projects-hub", kind: "builtin", label: "All projects", short: "Projects" },
      { value: "/news", kind: "builtin", label: "News & events", short: "News" },
      { value: "/gallery", kind: "builtin", label: "Photo gallery", short: "Gallery" },
      { value: "/videos", kind: "builtin", label: "Videos", short: "Videos" },
      { value: "/blogs", kind: "builtin", label: "Blog", short: "Blog" },
      { value: "/schemes", kind: "builtin", label: "All schemes", short: "Schemes" },
      { value: "/public-schemes", kind: "builtin", label: "Schemes (apply)", short: "Apply" },
      { value: "/privacy-policy", kind: "builtin", label: "Privacy policy", short: "Privacy Policy" },
      { value: "/login", kind: "builtin", label: "Admin login", short: "Login" },
      { value: "/beneficiary-login", kind: "builtin", label: "Beneficiary login / apply", short: "Apply" },
    ],
  },
];

export const BUTTON_ICONS: Array<{ value: string; label: string }> = [
  { value: "heart", label: "Heart" },
  { value: "hand-heart", label: "Helping hands" },
  { value: "user", label: "Person" },
  { value: "log-in", label: "Log in" },
  { value: "phone", label: "Phone" },
  { value: "mail", label: "Email" },
  { value: "arrow-right", label: "Arrow" },
  { value: "external", label: "External link" },
];

export const pageTarget = (slug: string) => `/p/${slug}`;

export function findDestination(target: string): NavDestination | undefined {
  for (const group of DESTINATION_GROUPS) {
    const hit = group.options.find((o) => o.value === target);
    if (hit) return hit;
  }
  return undefined;
}

type NavPage = Pick<SitePageSummary, "title" | "slug"> & Partial<Pick<SitePageSummary, "navLabel" | "navOrder" | "showInNav">>;

/** Every destination a menu already points at, so nothing is offered twice. */
function usedTargets(items: NavItem[]): Set<string> {
  const targets = items.flatMap((i) => [i.target, ...(i.children || []).map((c) => c.target)]);
  return new Set(targets.filter(Boolean));
}

/**
 * The About page's label, taken from the page the franchise actually published.
 *
 * This entry used to read "Baithuzzakath Kerala" outright. The automatic menu
 * is shared by every franchise — it is what they all see before they customise
 * their header — so that put one organisation's name in another's navigation
 * the moment a second franchise existed. The published page already carries the
 * label its own admin chose, so the menu defers to it and falls back to a plain
 * "About Us" only when there is no such page.
 */
function aboutPageLabel(pages: NavPage[]): string {
  const page = pages.find((p) => pageTarget(p.slug) === "/p/about-us");
  return page?.navLabel?.trim() || page?.title?.trim() || "About Us";
}

/** The automatic menu — what visitors see until the admin customizes the header. */
export function buildDefaultNavigation(pages: NavPage[] = []): NavigationSettings {
  const builtIn: NavItem[] = [
    // Home leads the menu. The logo links to "/" as well, and below `lg` the
    // bottom bar carries its own Home tab, so this is a deliberate third route
    // to the same place — visitors look for it in the menu regardless, and a
    // bar that opens on "About Us" reads as though it has been cut off.
    { type: "link", label: "Home", kind: "home", target: "/", visible: true },
    // "News" is not in the menu. The destination still exists — the footer
    // points at /news as "Updates".
    {
      type: "dropdown", label: "About Us", kind: "custom", target: "", visible: true,
      children: [
        { label: aboutPageLabel(pages), kind: "page", target: "/p/about-us", visible: true },
        { label: "Board of Directors", kind: "page", target: "/p/board-of-directors", visible: true },
        { label: "Our Schemes", kind: "builtin", target: "/public-schemes", visible: true },
      ],
    },
    { type: "link", label: "Projects", kind: "builtin", target: "/projects-hub", visible: true },
    {
      type: "dropdown", label: "Gallery", kind: "custom", target: "", visible: true,
      children: [
        { label: "Videos", kind: "builtin", target: "/videos", visible: true },
        { label: "Photos", kind: "builtin", target: "/gallery", visible: true },
      ],
    },
    { type: "link", label: "Download", kind: "builtin", target: "/download", visible: true },
    { type: "link", label: "Contact Us", kind: "page", target: "/p/contact-us", visible: true },
  ];

  // Contact Us, About Us and the rest are hand-written above *and* exist as
  // published pages, so appending every "show in menu" page listed them twice.
  const taken = usedTargets(builtIn);
  const pageItems: NavItem[] = pages
    .filter((p) => p.showInNav)
    .slice()
    .sort((a, b) => (a.navOrder || 0) - (b.navOrder || 0))
    .map((p): NavItem => ({ type: "link", label: p.navLabel || p.title, kind: "page", target: pageTarget(p.slug), visible: true }))
    .filter((i) => !taken.has(i.target));

  return {
    customized: false,
    menuAlignment: "center",
    items: [...builtIn, ...pageItems],
    buttons: [
      { label: "Donate", kind: "donate", target: "", style: "primary", icon: "heart", openInNewTab: true, visible: true },
      { label: "Login", kind: "builtin", target: "/login", style: "primary", icon: "log-in", visible: true },
    ],
  };
}

/** Fill in anything missing from a stored/partial value so the UI never sees undefined arrays. */
export function normalizeNavigation(raw?: Partial<NavigationSettings> | null): NavigationSettings {
  return {
    customized: !!raw?.customized,
    menuAlignment: raw?.menuAlignment || "center",
    items: (raw?.items || []).map((i) => ({
      ...i,
      type: i.type === "dropdown" ? "dropdown" : "link",
      children: (i.children || []).map((c) => ({ ...c, visible: c.visible !== false })),
      visible: i.visible !== false,
    })),
    buttons: (raw?.buttons || []).map((b) => ({
      ...b,
      style: b.style === "outline" ? "outline" : "primary",
      icon: b.icon || "",
      visible: b.visible !== false,
    })),
  };
}

/** A link can be shown when it is visible, labelled, and has somewhere to go (donate needs a donate link). */
export function isRenderable(link: NavLink, donateLink?: string): boolean {
  if (link.visible === false || !link.label?.trim()) return false;
  return link.kind === "donate" ? !!donateLink : !!link.target?.trim();
}

/** What visitors actually see: the custom config, or the automatic menu built from live pages. */
export function resolveNavigation(stored: NavigationSettings | undefined, pages: NavPage[], donateLink?: string) {
  const nav = stored?.customized
    ? stored
    : { ...buildDefaultNavigation(pages), menuAlignment: stored?.menuAlignment || "center" };

  const seen = new Set<string>();
  const items = nav.items
    .filter((i) => i.visible !== false && i.label?.trim())
    .map((i) => (i.type === "dropdown" ? { ...i, children: (i.children || []).filter((c) => isRenderable(c, donateLink)) } : i))
    .filter((i) => (i.type === "dropdown" ? (i.children || []).length > 0 : isRenderable(i, donateLink)))
    // A menu saved with the same destination twice (an older stored header kept
    // both the built-in Contact Us and the page of the same name) shows it once.
    .filter((i) => {
      if (i.type === "dropdown" || !i.target) return true;
      const key = i.target.replace(/\/+$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const buttons = nav.buttons.filter((b) => isRenderable(b, donateLink));

  return { menuAlignment: (nav.menuAlignment || "center") as MenuAlignment, items, buttons };
}

/** Is this link where the visitor currently is? Drives the menu's active pill. */
export function isActiveTarget(target: string | undefined, pathname: string): boolean {
  if (!target || target.startsWith("http") || target.includes("#")) return false;
  const clean = target.replace(/\/+$/, "") || "/";
  const here = pathname.replace(/\/+$/, "") || "/";
  return clean === "/" ? here === "/" : here === clean || here.startsWith(`${clean}/`);
}
