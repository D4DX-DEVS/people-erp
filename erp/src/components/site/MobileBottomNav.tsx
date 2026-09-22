import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, Home, Info, Sprout, type LucideIcon } from "lucide-react";
import { anchorOf, goToSiteTarget } from "@/lib/siteNav";
import { useSiteData } from "@/hooks/useSiteData";
import { isHomeSectionVisible } from "@/types/siteHome";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  icon: LucideIcon;
  target: string;
}

const BASE_TABS: Tab[] = [
  { label: "Home", icon: Home, target: "/" },
  // The full About Us page, not the home page's summary band — the band is a
  // teaser whose own "Learn More" goes here anyway.
  { label: "About Us", icon: Info, target: "/p/about-us" },
  { label: "Projects", icon: Sprout, target: "/projects-hub" },
];

/** Only offered by franchises that run the calculator section (see isHomeSectionVisible). */
const CALCULATOR_TAB: Tab = { label: "Calculator", icon: Calculator, target: "/#calculator" };

/**
 * App-style tab bar pinned to the bottom of the viewport below `lg`, where the
 * public site drops its desktop menu and footer (see SiteHeader / SiteFooter).
 *
 * Renders its own spacer so callers only have to drop it at the end of the page
 * — no per-page bottom padding to keep in sync with the bar's height.
 */
export function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [section, setSection] = useState<string | null>(null);
  const onHome = pathname === "/";

  // A tab pointing at a section this franchise has switched off would scroll
  // nowhere, so the bar is built from what the site actually renders.
  const { data: siteData } = useSiteData();
  const tabs = useMemo(
    () => (isHomeSectionVisible(siteData?.settings?.homeLayout, "calculator")
      ? [...BASE_TABS, CALCULATOR_TAB]
      : BASE_TABS),
    [siteData?.settings?.homeLayout],
  );

  /** Home-page section ids the bar highlights while scrolling. */
  const trackedSections = useMemo(
    () => tabs.map((t) => anchorOf(t.target)).filter((id): id is string => !!id),
    [tabs],
  );

  // Scroll spy. Anchor links scroll rather than push a hash, so location alone
  // cannot say whether the visitor is looking at About or the Calculator — the
  // -45% margins narrow the observer to a band across the middle of the
  // viewport, making "which section am I on" a single unambiguous answer.
  useEffect(() => {
    if (!onHome) {
      setSection(null);
      return;
    }
    const els = trackedSections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        setSection(trackedSections.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // trackedSections changes when the site's layout loads, and the observer
    // has to be rebuilt around the sections that actually exist by then.
  }, [onHome, trackedSections]);

  const isActive = (tab: Tab) => {
    const anchor = anchorOf(tab.target);
    if (anchor) return onHome && section === anchor;
    // Home only counts as current while no tracked section is in view,
    // otherwise two tabs light up at once on the way down the page.
    if (tab.target === "/") return onHome && section === null;
    return pathname === tab.target || pathname.startsWith(`${tab.target}/`);
  };

  return (
    <>
      {/* Keeps the fixed bar from covering the last of the page content. */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] lg:hidden" />

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.label}>
                <button
                  type="button"
                  onClick={() => goToSiteTarget(navigate, pathname, tab.target)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium leading-none transition-colors",
                    active ? "text-[hsl(var(--brand-green))]" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      active && "bg-[hsl(var(--brand-green))]/10",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="w-full truncate text-center">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
