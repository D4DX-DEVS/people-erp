import { useEffect, useState } from "react";

/**
 * Gap left between a floating control and whatever it is sitting above, in px.
 */
export const FLOATING_FOOTER_GAP = 24;

/**
 * How far a floating control must rise so it never overlaps the site footer.
 *
 * The footer is several hundred pixels tall and full of links, so a fixed
 * offset either parks the control absurdly high up the page or drops it on top
 * of the footer's contact column. Measuring is the only option that stays
 * right at every height.
 *
 * SiteFooter marks two elements — the desktop footer and the copyright strip
 * that replaces it below `lg` — and exactly one of them is displayed at any
 * width, so only the one with a layout box is measured.
 *
 * Returns 0 while the footer is off screen, so callers can leave their
 * responsive offset class in charge until this has something to say.
 */
export function useFooterClearance(): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const update = () => {
      const footer = Array.from(
        document.querySelectorAll<HTMLElement>("[data-site-footer]"),
      ).find((el) => el.offsetHeight > 0);
      if (!footer) {
        setOverlap(0);
        return;
      }
      const { top } = footer.getBoundingClientRect();
      setOverlap(Math.max(0, window.innerHeight - top));
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

  return overlap ? overlap + FLOATING_FOOTER_GAP : 0;
}
