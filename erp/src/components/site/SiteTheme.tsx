import { useEffect } from "react";
import { themeCss, themeVars } from "@/lib/siteColors";

interface SiteThemeProps {
  primary?: string;
  gradient?: string;
}

/**
 * Applies the website's brand palette (Website Settings → Colours) to the
 * document while a public page is mounted. Rendered by the public header, so
 * every public page gets it and the admin app never does.
 */
export function SiteTheme({ primary, gradient }: SiteThemeProps) {
  useEffect(() => {
    const vars = themeVars(primary, gradient);
    if (!Object.keys(vars).length) return;
    const el = document.createElement("style");
    el.setAttribute("data-site-theme", "");
    el.textContent = themeCss(vars);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [primary, gradient]);

  return null;
}
