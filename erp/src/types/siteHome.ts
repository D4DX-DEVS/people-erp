// Home page sections that the admin can reorder or hide (WebsiteSettings.homeLayout).
// The hero banner always comes first and the footer last; they are not part of this list.

export type HomeSectionKey =
  | "counters"
  | "about"
  | "pages"
  | "projects"
  | "schemes"
  | "news"
  | "gallery"
  | "videos"
  | "blogs"
  | "brochures"
  | "media"
  | "donation"
  | "partners"
  | "faq"
  | "contact";

export interface HomeSectionDef {
  key: HomeSectionKey;
  label: string;
  /** Where the section's content comes from — shown in the layout editor. */
  description: string;
}

export interface HomeLayoutItem {
  key: HomeSectionKey;
  visible: boolean;
}

/** Default order, matching how the home page rendered before layouts were configurable. */
export const HOME_SECTIONS: HomeSectionDef[] = [
  { key: "counters", label: "Impact counters", description: "The statistics counters set up in Website Settings." },
  { key: "about", label: "About us", description: "About text and image, vision, mission and core values." },
  { key: "pages", label: "Discover more", description: "Cards for custom pages marked “Show on home page”." },
  { key: "projects", label: "Projects", description: "The latest six projects." },
  { key: "schemes", label: "Schemes & programs", description: "Active schemes people can apply for." },
  { key: "news", label: "News & events", description: "The latest three published news items." },
  { key: "gallery", label: "Gallery", description: "Photo album covers." },
  { key: "videos", label: "Videos", description: "Featured videos." },
  { key: "blogs", label: "Blog", description: "The latest three blog posts." },
  { key: "brochures", label: "Reports & publications", description: "Downloadable brochures and reports." },
  { key: "media", label: "Media coverage", description: "Press mentions." },
  { key: "donation", label: "Donation", description: "Bank and UPI details — only when enabled in the Donation section." },
  { key: "partners", label: "Partners", description: "Partner logos." },
  { key: "faq", label: "FAQ", description: "Frequently asked questions." },
  { key: "contact", label: "Contact & volunteer", description: "Contact form and volunteer sign-up." },
];

const KNOWN = new Set<string>(HOME_SECTIONS.map((s) => s.key));

/**
 * Stored order first (unknown keys dropped, duplicates ignored), then any
 * section the stored value doesn't mention — so new sections never vanish.
 */
export function resolveHomeLayout(stored?: Array<Partial<HomeLayoutItem>> | null): HomeLayoutItem[] {
  const seen = new Set<string>();
  const out: HomeLayoutItem[] = [];
  for (const item of stored || []) {
    const key = item?.key;
    if (!key || !KNOWN.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, visible: item.visible !== false });
  }
  for (const def of HOME_SECTIONS) {
    if (!seen.has(def.key)) out.push({ key: def.key, visible: true });
  }
  return out;
}
