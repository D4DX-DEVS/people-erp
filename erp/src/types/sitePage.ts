// Shared types for dynamic website pages (SitePage model in the API).

export type SectionType =
  | "richtext"
  | "image-text"
  | "cards"
  | "stats"
  | "timeline"
  | "team"
  | "faq"
  | "cta"
  | "video"
  | "gallery"
  | "content";

export type ContentSource =
  | ""
  | "news"
  | "blogs"
  | "gallery"
  | "videos"
  | "projects"
  | "brochures"
  | "partners"
  | "faqs";

export interface SectionItem {
  _id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  imageKey?: string;
  icon?: string;
  /** Icon colour: swatch name or hex. Empty = the section's accent colour. */
  color?: string;
  link?: string;
  value?: string;
  order?: number;
}

export interface SectionImage {
  imageUrl?: string;
  imageKey?: string;
  caption?: string;
}

export type SectionBackground = "default" | "muted" | "primary" | "tint" | "custom";

export interface PageSection {
  _id?: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  /** Lucide icon shown above the heading. */
  icon?: string;
  /** Swatch name or hex used for the section icon, item icons and highlights. Empty = brand colour. */
  accentColor?: string;
  /** Hex used when `background` is "custom". */
  backgroundColor?: string;
  content?: string;
  imageUrl?: string;
  imageKey?: string;
  imagePosition?: "left" | "right";
  images?: SectionImage[];
  items?: SectionItem[];
  contentSource?: ContentSource;
  contentLimit?: number;
  /** Live records resolved server-side for `content` sections (public endpoint only). */
  contentItems?: any[];
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  columns?: number;
  background?: SectionBackground;
  order?: number;
  /** UI-only: builder expand/collapse state. Stripped before save. */
  _expanded?: boolean;
}

export interface SitePageHero {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  imageKey?: string;
}

export interface SitePage {
  _id?: string;
  title: string;
  slug: string;
  hero?: SitePageHero;
  sections: PageSection[];
  status: "draft" | "published";
  showInNav: boolean;
  navLabel?: string;
  navOrder?: number;
  showOnHome: boolean;
  homeOrder?: number;
  summary?: string;
  seo?: { title?: string; description?: string };
  createdAt?: string;
  updatedAt?: string;
}

/** Lightweight page record returned by the public list / home aggregate. */
export interface SitePageSummary {
  _id: string;
  title: string;
  slug: string;
  navLabel?: string;
  navOrder?: number;
  showInNav?: boolean;
  showOnHome?: boolean;
  homeOrder?: number;
  summary?: string;
  hero?: { imageUrl?: string; title?: string };
}

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  richtext: "Text Block",
  "image-text": "Image + Text",
  cards: "Card Grid",
  stats: "Stats / Counters",
  timeline: "Timeline",
  team: "Team / People",
  faq: "FAQ Accordion",
  cta: "Call to Action",
  video: "Video Embed",
  gallery: "Image Gallery",
  content: "Live Content Feed",
};

export const BACKGROUND_LABELS: Record<SectionBackground, string> = {
  default: "Plain",
  muted: "Soft grey",
  primary: "Brand gradient",
  tint: "Accent tint",
  custom: "Custom colour",
};

export const CONTENT_SOURCE_LABELS: Record<Exclude<ContentSource, "">, string> = {
  news: "News & Events",
  blogs: "Blogs",
  gallery: "Gallery Albums",
  videos: "Videos",
  projects: "Projects",
  brochures: "Brochures / Reports",
  partners: "Partners",
  faqs: "FAQs",
};

/**
 * Recommended upload dimensions, derived from how each image actually renders
 * on the public page. "Center-cropped" means the frame has a fixed aspect and
 * anything outside it is trimmed equally from both sides — keep the subject
 * centred and leave breathing room at the edges.
 */
export const IMAGE_SPECS = {
  hero: "1920 × 640 px (3:1). Full-width banner, center-cropped, darkened behind the title — avoid text in the image.",
  imageText: "1200 × 900 px (4:3). Shown at its own aspect ratio, never cropped — any ratio works, this is just the sharpest fit.",
  cards: "960 × 400 px (2.4:1). Center-cropped into a fixed 160px-tall band; a 16:9 photo also works but loses top and bottom.",
  team: "600 × 600 px (1:1). Center-cropped into a square — frame the face centrally.",
  gallery: "1200 × 1200 px (1:1). Square tile in the grid; the full uncropped image is shown in the lightbox.",
} as const;

/** Shown once wherever uploads appear. */
export const IMAGE_FORMAT_NOTE = "JPG, PNG, WebP or GIF · max 5MB";

/** Default shape for a newly added section in the builder. */
export function emptySection(type: SectionType, order: number): PageSection {
  return {
    type,
    title: "",
    subtitle: "",
    icon: "",
    accentColor: "",
    backgroundColor: "",
    content: "",
    imageUrl: "",
    imageKey: "",
    imagePosition: "right",
    images: [],
    items: [],
    contentSource: type === "content" ? "news" : "",
    contentLimit: 6,
    videoUrl: "",
    ctaText: "",
    ctaLink: "",
    columns: 3,
    background: "default",
    order,
  };
}
