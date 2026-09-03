// Shared helpers for project cards on the public website.

export const PROJECT_CATEGORIES = [
  "education", "healthcare", "housing", "livelihood", "emergency_relief", "infrastructure", "social_welfare", "other",
] as const;

export const categoryLabel = (category?: string) => (category || "other").replace(/_/g, " ");

// Stock image per category, used when a project has no cover image of its own.
const CATEGORY_IMAGES: Record<string, string> = {
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  healthcare: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  housing: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  livelihood: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  emergency_relief: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80",
  infrastructure: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80",
  social_welfare: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  other: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80",
};
export const categoryImage = (category?: string) => CATEGORY_IMAGES[category || "other"] || CATEGORY_IMAGES.other;

/** Project record as exposed by the public endpoints (home, hub, content feeds). */
export interface PublicProject {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  /** Slug of the published detail page, when one exists. */
  pageSlug?: string;
  /** Cover image from the detail page; overrides the category stock image. */
  coverImageUrl?: string;
}

export const projectImage = (p: PublicProject) => p.coverImageUrl || categoryImage(p.category);
/** Public route of the project's detail page, or null when it has none. */
export const projectPath = (p: PublicProject) => (p.pageSlug ? `/projects-hub/${p.pageSlug}` : null);
