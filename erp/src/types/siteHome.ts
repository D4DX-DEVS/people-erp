// Home page sections that the admin can reorder or hide (WebsiteSettings.homeLayout).
// The hero banner always comes first and the footer last; they are not part of this list.

export type HomeSectionKey =
  | "counters"
  | "about"
  | "projects"
  | "schemes"
  | "calculator"
  | "news"
  | "gallery"
  | "videos"
  | "blogs"
  | "media"
  | "donation"
  | "faq"
  | "associates";

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
  { key: "projects", label: "Projects", description: "The latest six projects." },
  { key: "schemes", label: "Schemes & programs", description: "Active schemes people can apply for." },
  { key: "calculator", label: "Zakat calculator", description: "An interactive Zakat calculator, always available." },
  { key: "news", label: "News & events", description: "The latest three published news items." },
  { key: "gallery", label: "Gallery", description: "Photo album covers." },
  { key: "videos", label: "Videos", description: "Now shown alongside the Gallery section, not on its own — this toggle no longer has an independent effect." },
  { key: "blogs", label: "Blog", description: "The latest three blog posts." },
  { key: "media", label: "Media coverage", description: "Press mentions." },
  { key: "donation", label: "Volunteer & donation CTA", description: "Become a Volunteer + Support Our Mission banner. Bank/UPI details show only when enabled in the Donation section." },
  { key: "faq", label: "FAQ", description: "Frequently asked questions." },
  { key: "associates", label: "Associates & partners", description: "Sliding strip of the logos entered under Partners, shown just above the footer." },
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

/**
 * Whether one home section is on for this site.
 *
 * Sections are per-franchise (WebsiteSettings.homeLayout), and anything the
 * stored layout does not mention counts as visible — same rule as
 * resolveHomeLayout, so a section added to the code later does not vanish from
 * sites saved before it existed.
 *
 * Used outside the home page too: the header and the mobile tab bar link to the
 * calculator, and a link to a section this franchise has switched off just
 * scrolls nowhere.
 */
export function isHomeSectionVisible(
  stored: Array<Partial<HomeLayoutItem>> | null | undefined,
  key: HomeSectionKey,
): boolean {
  return resolveHomeLayout(stored).find((item) => item.key === key)?.visible !== false;
}
