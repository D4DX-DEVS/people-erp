import DOMPurify from "dompurify";

/** True when a stored body carries markup from the rich-text editor (vs. legacy plain text). */
export const isHtml = (v?: string) => /<\/?[a-z][^>]*>/i.test(v || "");

/** Plain-text version of a body, for excerpts, cards and search. */
export function stripHtml(v?: string): string {
  if (!v) return "";
  if (!isHtml(v)) return v;
  return v
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim();
}

/** Sanitised HTML safe to inject; links open in a new tab. */
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "s", "strike", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "span", "div", "hr"],
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
  });
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}
