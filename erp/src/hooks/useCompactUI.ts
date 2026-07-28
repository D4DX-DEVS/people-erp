import { useEffect } from "react";

/**
 * Applies the compact admin design scale (see index.css → html.compact-ui)
 * while the calling page/layout is mounted. Used by the admin <Layout />,
 * the beneficiary portal pages and the Global Admin dashboard so every
 * authenticated experience shares the same compact styling.
 */
export function useCompactUI() {
  useEffect(() => {
    document.documentElement.classList.add("compact-ui");
    return () => document.documentElement.classList.remove("compact-ui");
  }, []);
}
