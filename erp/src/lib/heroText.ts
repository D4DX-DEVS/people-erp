// Hero text formatting: the options an admin can pick from, and the turning of
// a saved HeroTextStyle into inline CSS for the public pages.
import type { CSSProperties } from "react";
import { colorValue } from "@/lib/siteColors";
import type { HeroTextStyle } from "@/types/sitePage";

/** "" = keep the page's own face. The first four are already loaded by index.html. */
export const HERO_TEXT_FONTS = [
  { value: "", label: "Default", css: "" },
  { value: "display", label: "Clash Display", css: '"Clash Display", Montserrat, "Anek Malayalam", system-ui, sans-serif' },
  { value: "site", label: "Montserrat", css: 'Montserrat, "Anek Malayalam", system-ui, sans-serif' },
  { value: "malayalam", label: "Anek Malayalam", css: '"Anek Malayalam", Montserrat, system-ui, sans-serif' },
  { value: "serif", label: "Serif", css: 'Georgia, "Times New Roman", serif' },
  { value: "system", label: "System", css: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
] as const;

export const HERO_TEXT_SIZES = [
  { value: "", label: "Default" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
] as const;

export const HERO_TEXT_WEIGHTS = [
  { value: "", label: "Default" },
  { value: "normal", label: "Regular" },
  { value: "medium", label: "Medium" },
  { value: "semibold", label: "Semi-bold" },
  { value: "bold", label: "Bold" },
] as const;

// Fluid sizes, so a preset still fits a phone: a fixed 4.5rem title would
// overflow a 360px screen where the page's own classes step down by breakpoint.
const TITLE_SIZES: Record<string, string> = {
  sm: "clamp(1.5rem, 4vw, 2.25rem)",
  md: "clamp(1.875rem, 5vw, 3rem)",
  lg: "clamp(2.25rem, 6vw, 3.75rem)",
  xl: "clamp(2.5rem, 7.5vw, 4.5rem)",
};
const SUBTITLE_SIZES: Record<string, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "clamp(1.0625rem, 2.2vw, 1.25rem)",
  xl: "clamp(1.125rem, 2.8vw, 1.5rem)",
};
const WEIGHTS: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };

/**
 * The built-in inner pages whose hero text is edited under Website Settings →
 * Page Heroes. Keep in sync with HERO_PAGE_KEYS in api/src/models/WebsiteSettings.js.
 */
export const HERO_PAGES = [
  { key: "projects", label: "Projects", path: "/projects-hub", title: "Our Projects", subtitle: "Initiatives transforming lives in our communities." },
  { key: "schemes", label: "Schemes", path: "/schemes", title: "Schemes & Programs", subtitle: "Focused initiatives for a stronger, self-reliant community." },
  { key: "news", label: "News & Events", path: "/news", title: "News & Events", subtitle: "Latest happenings and announcements." },
  { key: "blogs", label: "Blog", path: "/blogs", title: "From our Blog", subtitle: "Perspectives, insights and stories." },
  { key: "gallery", label: "Gallery", path: "/gallery", title: "Gallery", subtitle: "Glimpses from our work on the ground." },
  { key: "videos", label: "Videos", path: "/videos", title: "Videos", subtitle: "Stories of change in motion." },
  { key: "media", label: "Media Coverage", path: "/media", title: "Media Coverage", subtitle: "Press mentions and news features." },
  { key: "downloads", label: "Downloads", path: "/download", title: "Downloads", subtitle: "Brochures, reports and guidelines you can download." },
  { key: "privacy", label: "Privacy Policy", path: "/privacy-policy", title: "Privacy Policy", subtitle: "How we collect, use, and protect your personal information." },
] as const;

export type HeroPageKey = (typeof HERO_PAGES)[number]["key"];

/** What an admin saved for one built-in page's hero (Website Settings → Page Heroes). */
export interface PageHeroSettings {
  title?: string;
  subtitle?: string;
  titleStyle?: HeroTextStyle;
  subtitleStyle?: HeroTextStyle;
}

export const isHeroTextCustomised = (style?: HeroTextStyle) =>
  !!style && (!!style.hidden || !!style.font || !!style.size || !!style.weight || !!style.color);

/**
 * Inline CSS for one line of hero text; undefined when nothing is customised, so
 * the element keeps exactly the classes it had before this option existed.
 * Inline rather than classes because the elements already carry their own
 * size/colour/weight classes, and an inline value wins over all of them.
 */
export function heroTextCss(style: HeroTextStyle | undefined, kind: "title" | "subtitle"): CSSProperties | undefined {
  if (!style) return undefined;
  const css: CSSProperties = {};
  const font = HERO_TEXT_FONTS.find((f) => f.value === style.font);
  if (font?.css) css.fontFamily = font.css;
  const size = (kind === "title" ? TITLE_SIZES : SUBTITLE_SIZES)[style.size || ""];
  if (size) css.fontSize = size;
  const weight = WEIGHTS[style.weight || ""];
  if (weight) css.fontWeight = weight;
  if (style.color) css.color = colorValue(style.color);
  return Object.keys(css).length ? css : undefined;
}

/** Just the colour — for the spans of a two-tone title, whose own classes would otherwise keep their tone. */
export const heroTextColor = (style?: HeroTextStyle): CSSProperties | undefined =>
  style?.color ? { color: colorValue(style.color) } : undefined;
