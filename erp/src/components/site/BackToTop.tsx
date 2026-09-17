import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** How far down the page the visitor must be, in viewport heights, before the
 *  button appears. Roughly "past the fold and heading for the bottom". */
const SHOW_AFTER_SCREENS = 1.5;

/** Gap left between the button and whatever it is sitting above, in px. */
const FOOTER_GAP = 24;

/**
 * Floating "back to top" control for the public site, on every screen size.
 *
 * Two things sit at the bottom of the viewport and the button has to stay off
 * both: the mobile tab bar below `lg` (MobileBottomNav, a fixed 4.5rem plus the
 * safe-area inset) and the site footer. The footer is handled at runtime rather
 * than with a fixed offset because it is several hundred pixels tall and full
 * of links — a static offset either overlaps its contact column or floats
 * absurdly high up the page.
 *
 * SiteFooter marks two elements, the desktop footer and the copyright strip
 * that replaces it below `lg`; exactly one of them is displayed at any width,
 * so the button measures whichever currently has a layout box.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [footerOverlap, setFooterOverlap] = useState(0);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS);

      // How much of the footer is currently on screen. The hidden one of the
      // pair measures zero, so skipping zero-height elements picks out the
      // variant this width actually renders.
      const footer = Array.from(
        document.querySelectorAll<HTMLElement>("[data-site-footer]"),
      ).find((el) => el.offsetHeight > 0);
      if (!footer) {
        setFooterOverlap(0);
        return;
      }
      const { top } = footer.getBoundingClientRect();
      setFooterOverlap(Math.max(0, window.innerHeight - top));
    };

    update();
    // passive: this listener never calls preventDefault, and saying so lets the
    // browser keep scrolling on its own thread.
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      // Hidden from the tab order and the accessibility tree while faded out —
      // opacity alone would leave a focusable, announced control behind.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      // Only set once the footer is actually on screen, so the responsive
      // class below stays in charge everywhere else.
      style={footerOverlap ? { bottom: `${footerOverlap + FOOTER_GAP}px` } : undefined}
      className={cn(
        "fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full",
        "border border-white/15 bg-[image:var(--gradient-brand)] text-white shadow-lg",
        "transition-all duration-300 hover:brightness-110",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--brand-green))]",
        "motion-reduce:transition-none lg:right-6",
        // Above the mobile tab bar; a plain corner offset from lg up, which the
        // inline style takes over from once the footer scrolls into view.
        "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
