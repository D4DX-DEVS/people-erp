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
      { value: "/#contact", kind: "section", label: "Contact form section", short: "Contact" },
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
      { value: "/public-schemes", kind: "builtin", label: "Schemes", short: "Schemes" },
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

/** The automatic menu — what visitors see until the admin customizes the header. */
export function buildDefaultNavigation(pages: NavPage[] = []): NavigationSettings {
  const pageItems: NavItem[] = pages
    .filter((p) => p.showInNav)
    .slice()
    .sort((a, b) => (a.navOrder || 0) - (b.navOrder || 0))
    .map((p) => ({ type: "link", label: p.navLabel || p.title, kind: "page", target: pageTarget(p.slug), visible: true }));

  return {
    customized: false,
    menuAlignment: "center",
    items: [
      { type: "link", label: "Home", kind: "home", target: "/", visible: true },
      { type: "link", label: "About", kind: "section", target: "/#about", visible: true },
      { type: "link", label: "Projects", kind: "builtin", target: "/projects-hub", visible: true },
      { type: "link", label: "News", kind: "builtin", target: "/news", visible: true },
      { type: "link", label: "Gallery", kind: "builtin", target: "/gallery", visible: true },
      { type: "link", label: "Videos", kind: "builtin", target: "/videos", visible: true },
      { type: "link", label: "Blog", kind: "builtin", target: "/blogs", visible: true },
      { type: "link", label: "Contact", kind: "section", target: "/#contact", visible: true },
      ...pageItems,
    ],
    buttons: [
      { label: "Donate", kind: "donate", target: "", style: "primary", icon: "heart", openInNewTab: true, visible: true },
      { label: "Login", kind: "builtin", target: "/login", style: "outline", icon: "", visible: true },
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

  const items = nav.items
    .filter((i) => i.visible !== false && i.label?.trim())
    .map((i) => (i.type === "dropdown" ? { ...i, children: (i.children || []).filter((c) => isRenderable(c, donateLink)) } : i))
    .filter((i) => (i.type === "dropdown" ? (i.children || []).length > 0 : isRenderable(i, donateLink)));
  const buttons = nav.buttons.filter((b) => isRenderable(b, donateLink));

  return { menuAlignment: (nav.menuAlignment || "center") as MenuAlignment, items, buttons };
}
