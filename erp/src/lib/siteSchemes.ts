// Shared helpers for scheme cards and detail links on the public website.
// The project equivalent lives in lib/siteProjects.ts.

/** Scheme record as exposed by the public endpoints (home, schemes list). */
export interface PublicScheme {
  _id: string;
  name?: string;
  /** Legacy alias some older records still carry. */
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  imageUrl?: string;
  /** Slug of the detail page. The API sets this for every active scheme. */
  pageSlug?: string;
}

/** Same rules as slugify() in api/src/utils/siteContent.js — keep the two in step. */
export function slugifyScheme(text?: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const schemeName = (s: PublicScheme) => s.name || s.title || "";

/**
 * Public route of a scheme's detail page.
 *
 * Every active scheme has one: the API serves a page generated from the scheme
 * record when no admin-built page exists, so this never returns null the way
 * projectPath() used to. `pageSlug` comes from the API; the local slugify is
 * only a fallback for payloads that predate it.
 */
export const schemePath = (s: PublicScheme) => `/schemes/${s.pageSlug || slugifyScheme(schemeName(s))}`;
