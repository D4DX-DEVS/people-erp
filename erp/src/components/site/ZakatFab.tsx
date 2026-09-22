import { Calculator } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { goToSiteTarget } from "@/lib/siteNav";
import { useFooterClearance } from "@/hooks/useFooterClearance";
import { cn } from "@/lib/utils";

/**
 * Floating Zakat shortcut for franchises that keep the calculator out of the
 * header (see usesFloatingZakatButton).
 *
 * Desktop only, and deliberately so: below `lg` the public site runs as an app
 * shell whose tab bar already carries a Calculator tab, so a floating control
 * there would be a second copy of a control sitting an inch below it. The
 * header button it replaces is itself desktop-only, which is why the two swap
 * cleanly rather than overlapping at any width.
 *
 * Sits bottom-left because BackToTop already owns the bottom-right corner.
 */
export function ZakatFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearance = useFooterClearance();

  return (
    <button
      type="button"
      onClick={() => goToSiteTarget(navigate, location.pathname, "/#calculator")}
      aria-label="Calculate Zakat"
      title="Calculate Zakat"
      // Only set once the footer is on screen, so the responsive class stays in
      // charge everywhere above it.
      style={clearance ? { bottom: `${clearance}px` } : undefined}
      className={cn(
        "fixed bottom-6 left-6 z-40 hidden h-11 w-11 items-center justify-center rounded-full lg:flex",
        "border border-white/15 bg-[image:var(--gradient-brand)] text-white shadow-lg",
        "transition-all duration-300 hover:brightness-110",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--brand-green))]",
        "motion-reduce:transition-none",
      )}
    >
      <Calculator className="h-5 w-5" />
    </button>
  );
}
