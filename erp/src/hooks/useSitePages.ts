import { useQuery } from "@tanstack/react-query";
import { sitePages } from "@/lib/api";
import type { SitePage, SitePageSummary } from "@/types/sitePage";

/** Published dynamic pages (nav + home overview). Cached and shared across the public site. */
export function usePublicPages() {
  return useQuery({
    queryKey: ["site-pages-public"],
    queryFn: async () => {
      const res: any = await sitePages.getPublicList();
      return (res?.data || []) as SitePageSummary[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** One published dynamic page by slug, with live content sections resolved server-side. */
export function usePublicPage(slug?: string) {
  return useQuery({
    queryKey: ["site-page", slug],
    queryFn: async () => {
      const res: any = await sitePages.getPublicBySlug(slug!);
      return (res?.data || null) as SitePage | null;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}
