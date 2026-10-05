import type { NavigateFunction } from "react-router-dom";

/** "/#about" and "#about" carry a home-page anchor; anything else is a route. */
export function anchorOf(target: string): string | null {
  if (target.startsWith("/#")) return target.slice(2);
  if (target.startsWith("#")) return target.slice(1);
  return null;
}

const ABSOLUTE_URL = /^(https?:)?\/\//i;
const PROTOCOL_LINK = /^(mailto|tel|whatsapp|sms):/i;

/** Does this target stay inside the app — a route or a home-page anchor — rather than leave it? */
export function isInAppTarget(target?: string): boolean {
  return !!target && !ABSOLUTE_URL.test(target) && !PROTOCOL_LINK.test(target);
}

/**
 * Turns the full web address of one of this site's own pages into its in-app path.
 *
 * Menus are often built on the live site, where it is natural to paste the
 * address from the browser bar: `https://<live-host>/p/about-us`. Saved that way
 * the link carries the live host with it, so on any other address (a local
 * build, a staging site, a second domain) it throws the visitor over to the live
 * site, and even on the live site it reloads the whole app instead of routing.
 *
 * A web address counts as "this site" when it is on the address being viewed, or
 * when it is `/p/<slug>` for a page this site has published. Anything else —
 * another organisation's site, a file, a payment link — is left exactly as saved.
 */
export function localiseTarget(target: string, pageSlugs: Iterable<string> = []): string {
  if (!ABSOLUTE_URL.test(target) || typeof window === "undefined") return target;
  let url: URL;
  try {
    url = new URL(target, window.location.origin);
  } catch {
    return target;
  }
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (url.host === window.location.host) return path;

  const page = url.pathname.match(/^\/p\/([^/]+)\/?$/);
  if (page && new Set(pageSlugs).has(decodeURIComponent(page[1]).toLowerCase())) return path;
  return target;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/**
 * Sends a visitor to a public-site target: an external URL, a protocol link
 * (tel:/mailto:), a route, or a "/#anchor" that scrolls to a home section.
 *
 * Shared by the desktop header, the mobile drawer and the mobile bottom bar so
 * the anchor dance — route to "/" first when we are elsewhere, then scroll once
 * the page has painted — is written once rather than in each of them.
 */
export function goToSiteTarget(
  navigate: NavigateFunction,
  pathname: string,
  target?: string,
  openInNewTab?: boolean,
): void {
  if (!target) return;

  if (openInNewTab) {
    window.open(target, "_blank", "noopener");
    return;
  }

  const isExternal = ABSOLUTE_URL.test(target);
  const isProtocol = PROTOCOL_LINK.test(target);
  if (isExternal || isProtocol) {
    window.location.assign(target);
    return;
  }

  const anchor = anchorOf(target);
  if (anchor === null) {
    navigate(target);
    return;
  }
  if (pathname !== "/") {
    navigate("/");
    setTimeout(() => scrollToId(anchor), 100);
  } else {
    scrollToId(anchor);
  }
}
