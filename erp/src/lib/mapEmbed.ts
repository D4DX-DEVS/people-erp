/**
 * Turn whatever an admin pastes into the Location Map field into a URL that is
 * actually safe to put in an iframe.
 *
 * Admins reach for this field with one of four things in hand, so all four are
 * accepted: the full <iframe …> snippet from Google Maps → Share → Embed a map,
 * the bare embed URL out of that snippet, a normal maps.google.com link copied
 * from the address bar, or just the office address typed out.
 *
 * Anything else returns null rather than being passed through: the value ends
 * up as an iframe `src` on a public page, so only the map hosts below are ever
 * framed.
 */

/** Hosts we will frame directly. */
const EMBED_HOSTS = [
  "www.google.com",
  "google.com",
  "maps.google.com",
  "www.google.co.in",
  "google.co.in",
  "www.openstreetmap.org",
  "openstreetmap.org",
];

/**
 * Share links that cannot be framed and cannot be expanded in the browser
 * either — Google serves them with X-Frame-Options and the redirect is opaque
 * to fetch(). Detected so the editor can say so instead of showing a blank box.
 */
const SHORT_LINK = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i;

const asQueryEmbed = (query: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

/** True for a link that has to be re-copied as an embed before it will work. */
export function isUnframeableMapLink(value?: string): boolean {
  return SHORT_LINK.test((value || "").trim());
}

/**
 * The iframe `src` for a Location Map value, or null when there is nothing
 * usable to show.
 */
export function mapEmbedSrc(value?: string): string | null {
  let raw = (value || "").trim();
  if (!raw) return null;

  // "Embed a map" hands over a whole <iframe> tag — pull the src back out.
  if (/<iframe/i.test(raw)) {
    const src = raw.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!src) return null;
    raw = src[1].trim();
  }

  if (!/^https?:\/\//i.test(raw)) {
    // Not a URL at all: treat it as an address / "lat,lng" and let Maps search.
    return asQueryEmbed(raw);
  }

  if (SHORT_LINK.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!EMBED_HOSTS.includes(url.hostname.toLowerCase())) return null;

  // Already an embed URL (…/maps/embed?pb=… or …?output=embed) — use as-is.
  if (url.pathname.startsWith("/maps/embed") || url.searchParams.get("output") === "embed") {
    return url.toString();
  }
  if (url.hostname.toLowerCase().endsWith("openstreetmap.org")) {
    return url.pathname.startsWith("/export/embed.html") ? url.toString() : null;
  }

  // A plain maps link: rebuild it as an embed around whatever it points at —
  // the ?q= place, or the @lat,lng in the path when there is no q.
  const q = url.searchParams.get("q");
  if (q) return asQueryEmbed(q);

  const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return asQueryEmbed(`${at[1]},${at[2]}`);

  const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (place) return asQueryEmbed(decodeURIComponent(place[1]).replace(/\+/g, " "));

  return null;
}
