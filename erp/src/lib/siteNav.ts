import type { NavigateFunction } from "react-router-dom";

/** "/#about" and "#about" carry a home-page anchor; anything else is a route. */
export function anchorOf(target: string): string | null {
  if (target.startsWith("/#")) return target.slice(2);
  if (target.startsWith("#")) return target.slice(1);
  return null;
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

  const isExternal = /^(https?:)?\/\//i.test(target);
  const isProtocol = /^(mailto|tel|whatsapp|sms):/i.test(target);
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
