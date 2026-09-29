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

/** The copy at the top of a section. Empty/missing = the built-in wording. */
export interface HomeHeadingText {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

/** Swatch names or hex (see lib/siteColors). Empty/missing = the built-in colour. */
export interface HomeHeadingStyle {
  eyebrowColor?: string;
  /** The title's leading words. */
  titleColor?: string;
  /** The title's last word, which carries the brand accent by default. */
  accentColor?: string;
  subtitleColor?: string;
  /** The short rule under the heading (only some sections draw one). */
  dividerColor?: string;
}

export interface HomeSectionDef {
  key: HomeSectionKey;
  label: string;
  /** Where the section's content comes from — shown in the layout editor. */
  description: string;
  /**
   * The built-in heading copy. Only the parts present here exist on the page
   * (a band with no eyebrow offers no eyebrow field); absent altogether means
   * the section has no editable heading at all.
   */
  heading?: HomeHeadingText;
  /** The title ends in an accent-coloured word (the centred house heading, and the schemes intro). */
  accent?: boolean;
  /** The heading draws the short rule beneath it. */
  divider?: boolean;
}

export interface HomeLayoutItem extends HomeHeadingText, HomeHeadingStyle {
  key: HomeSectionKey;
  visible: boolean;
}

export const HOME_HEADING_FIELDS = ["eyebrow", "title", "subtitle", "eyebrowColor", "titleColor", "accentColor", "subtitleColor", "dividerColor"] as const;

/** Default order, matching how the home page rendered before layouts were configurable. */
export const HOME_SECTIONS: HomeSectionDef[] = [
  {
    key: "about", label: "About us", description: "About text and image, vision, mission and core values.",
    // The title itself is the About Us title from Website Settings.
    heading: { eyebrow: "About Us" },
  },
  {
    key: "projects", label: "Projects", description: "The latest six projects.",
    heading: { eyebrow: "Zakat in Action", title: "Our Projects", subtitle: "Real support for real lives. Explore our key initiatives." },
    accent: true, divider: true,
  },
  {
    key: "schemes", label: "Schemes & programs", description: "Active schemes people can apply for.",
    heading: {
      eyebrow: "Support Programs", title: "Schemes & Programs",
      subtitle: "Focused initiatives for a stronger, self-reliant community. Scroll to walk through each program — every card carries its own story.",
    },
    accent: true,
  },
  {
    key: "calculator", label: "Zakat calculator", description: "An interactive Zakat calculator, always available.",
    heading: { eyebrow: "Zakat Calculator", title: "Calculate Your Zakat", subtitle: "Know your Zakat obligation in just a few simple steps." },
    accent: true, divider: true,
  },
  {
    key: "news", label: "News & events", description: "The latest three published news items.",
    heading: { title: "What we’ve been up to lately" },
  },
  {
    key: "gallery", label: "Gallery", description: "Photo album covers.",
    heading: { eyebrow: "Gallery", title: "Moments That Matter" },
  },
  {
    key: "videos", label: "Videos", description: "Now shown alongside the Gallery section, not on its own — this toggle no longer has an independent effect.",
    heading: { title: "Videos" },
  },
  {
    key: "blogs", label: "Blog", description: "The latest three blog posts.",
    heading: { title: "Blogs" },
  },
  {
    key: "media", label: "Media coverage", description: "Press mentions.",
    heading: { eyebrow: "In the news", title: "Media Coverage" },
    accent: true, divider: true,
  },
  {
    key: "donation", label: "Volunteer & donation CTA",
    description: "Become a Volunteer + Support Our Mission banner. Its wording and column colours are set in the Donation section below; bank/UPI details show only when enabled there.",
  },
  {
    key: "faq", label: "FAQ", description: "Frequently asked questions.",
    heading: { eyebrow: "Help", title: "Frequently Asked Questions" },
    accent: true, divider: true,
  },
  {
    key: "associates", label: "Associates & partners", description: "Sliding strip of the logos entered under Partners, shown just above the footer.",
    heading: { eyebrow: "Our Network", title: "Associates & Partners", subtitle: "Working together with organisations that share our purpose." },
    accent: true, divider: true,
  },
  { key: "counters", label: "Impact counters", description: "The statistics counters set up in Website Settings." },
];

const KNOWN = new Set<string>(HOME_SECTIONS.map((s) => s.key));
const DEFS = new Map(HOME_SECTIONS.map((s) => [s.key, s]));

/** Copy the heading fields off a stored item, dropping anything that isn't a string. */
function pickHeading(item: Partial<HomeLayoutItem> | undefined): HomeHeadingText & HomeHeadingStyle {
  const out: Record<string, string> = {};
  for (const field of HOME_HEADING_FIELDS) {
    const v = item?.[field];
    if (typeof v === "string" && v.trim()) out[field] = v.trim();
  }
  return out;
}

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
    out.push({ key, visible: item.visible !== false, ...pickHeading(item) });
  }
  for (const def of HOME_SECTIONS) {
    if (!seen.has(def.key)) out.push({ key: def.key, visible: true });
  }
  return out;
}

export interface ResolvedHomeHeading extends HomeHeadingStyle {
  eyebrow: string;
  title: string;
  subtitle: string;
}

/**
 * What a section's heading actually says and what colour it is: the admin's
 * override where one is set, else the built-in copy; colours stay empty when
 * unset so the renderer keeps its default classes.
 */
export function resolveHomeHeading(stored: Array<Partial<HomeLayoutItem>> | null | undefined, key: HomeSectionKey): ResolvedHomeHeading {
  const defaults = DEFS.get(key)?.heading || {};
  const item = (stored || []).find((s) => s?.key === key);
  const override = pickHeading(item);
  return {
    eyebrow: override.eyebrow ?? defaults.eyebrow ?? "",
    title: override.title ?? defaults.title ?? "",
    subtitle: override.subtitle ?? defaults.subtitle ?? "",
    eyebrowColor: override.eyebrowColor,
    titleColor: override.titleColor,
    accentColor: override.accentColor,
    subtitleColor: override.subtitleColor,
    dividerColor: override.dividerColor,
  };
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
