import { useMemo } from 'react';
import { useConfig } from '@/contexts/ConfigContext';

/**
 * Turn a logo path from the config API into something an <img> can load.
 *
 * Uploaded franchise logos live in object storage and arrive as absolute
 * URLs, which must be used verbatim. Built-in marks arrive as server-relative
 * paths ("/assets/logo.png") and need the API origin in front of them, since
 * the frontend is served from a different host in every deployment.
 */
export function resolveOrgAssetUrl(assetPath?: string): string {
  if (!assetPath) return '';
  if (/^(https?:)?\/\/|^data:/i.test(assetPath)) return assetPath;

  const apiUrl = import.meta.env.VITE_API_URL || '';
  // VITE_API_URL = "http://localhost:8000/api"
  // Strip the trailing /api (or /api/v1 etc.) to get the server origin
  const serverOrigin = apiUrl.replace(/\/api(\/v\d+)?$/, '');
  return `${serverOrigin}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
}

/**
 * Returns the fully-qualified primary logo URL for the current franchise.
 */
export function useOrgLogoUrl(): string {
  const { org } = useConfig();
  return useMemo(() => resolveOrgAssetUrl(org.logoUrl), [org.logoUrl]);
}

/**
 * Every branding mark the current franchise has, fully qualified.
 *
 * `footer` falls back to the primary logo: most franchises only upload one
 * mark, and a franchise-specific logo on a dark band still beats the wrong
 * franchise's dedicated footer lockup.
 */
export function useOrgLogos(): { primary: string; footer: string; favicon: string } {
  const { org } = useConfig();

  return useMemo(() => {
    const primary = resolveOrgAssetUrl(org.logoUrl);
    return {
      primary,
      footer: resolveOrgAssetUrl(org.footerLogoUrl) || primary,
      favicon: resolveOrgAssetUrl(org.faviconUrl) || primary,
    };
  }, [org.logoUrl, org.footerLogoUrl, org.faviconUrl]);
}
