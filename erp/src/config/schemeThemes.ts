import imgHealthcare from "@/assets/schemes/healthcare.jpg";
import imgHousing from "@/assets/schemes/housing.jpg";
import imgInfrastructure from "@/assets/schemes/infrastructure.jpg";
import imgLivelihood from "@/assets/schemes/livelihood.jpg";
import imgOther from "@/assets/schemes/other.jpg";
import imgSocialWelfare from "@/assets/schemes/social_welfare.jpg";

export interface SchemeTheme {
  /** Icon chip behind the category glyph. */
  badge: string;
  /** Category eyebrow above the scheme name. */
  label: string;
  /** "Learn More" affordance. */
  link: string;
  /** Filled circular arrow button on the media panel. */
  button: string;
  /** Media panel wash, used when a scheme has no image of its own. */
  panel: string;
  /** Card body tint — kept faint so six of them side by side stay calm. */
  card: string;
  icon: string;
  /** Fallback artwork, used when a scheme has no imageUrl of its own. */
  image?: string;
}

/**
 * Per-category colour + icon for scheme cards.
 *
 * Keyed by category rather than rotated by array index: an index-based tint
 * means the same scheme changes colour whenever the list is reordered or a
 * scheme is added above it, and healthcare could come out gold while housing
 * comes out red. Categories mirror the enum in api/src/models/Scheme.js.
 */
export const SCHEME_THEMES: Record<string, SchemeTheme> = {
  education: {
    badge: "bg-sky-100 text-sky-700", label: "text-sky-700", link: "text-sky-700",
    button: "bg-sky-600 hover:bg-sky-700", panel: "from-sky-100 to-sky-50",
    card: "from-white to-sky-50/70", icon: "graduation-cap", image: imgOther,
  },
  healthcare: {
    badge: "bg-rose-100 text-rose-700", label: "text-rose-700", link: "text-rose-700",
    button: "bg-rose-600 hover:bg-rose-700", panel: "from-rose-100 to-rose-50",
    card: "from-white to-rose-50/70", icon: "stethoscope", image: imgHealthcare,
  },
  housing: {
    badge: "bg-amber-100 text-amber-700", label: "text-amber-700", link: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700", panel: "from-amber-100 to-amber-50",
    card: "from-white to-amber-50/70", icon: "home", image: imgHousing,
  },
  livelihood: {
    badge: "bg-green-100 text-green-700", label: "text-green-700", link: "text-green-700",
    button: "bg-green-700 hover:bg-green-800", panel: "from-green-100 to-green-50",
    card: "from-white to-green-50/70", icon: "briefcase", image: imgLivelihood,
  },
  emergency_relief: {
    badge: "bg-orange-100 text-orange-700", label: "text-orange-700", link: "text-orange-700",
    button: "bg-orange-600 hover:bg-orange-700", panel: "from-orange-100 to-orange-50",
    card: "from-white to-orange-50/70", icon: "hand-coins", image: imgSocialWelfare,
  },
  infrastructure: {
    badge: "bg-blue-100 text-blue-700", label: "text-blue-700", link: "text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700", panel: "from-blue-100 to-blue-50",
    card: "from-white to-blue-50/70", icon: "droplet", image: imgInfrastructure,
  },
  social_welfare: {
    badge: "bg-violet-100 text-violet-700", label: "text-violet-700", link: "text-violet-700",
    button: "bg-violet-600 hover:bg-violet-700", panel: "from-violet-100 to-violet-50",
    card: "from-white to-violet-50/70", icon: "users", image: imgSocialWelfare,
  },
  other: {
    badge: "bg-emerald-100 text-emerald-700", label: "text-emerald-700", link: "text-emerald-700",
    button: "bg-emerald-700 hover:bg-emerald-800", panel: "from-emerald-100 to-emerald-50",
    card: "from-white to-emerald-50/70", icon: "layers", image: imgOther,
  },
};

export const schemeTheme = (category?: string): SchemeTheme =>
  SCHEME_THEMES[category || "other"] || SCHEME_THEMES.other;
