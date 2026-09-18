/**
 * Per-franchise interface switches for the public site.
 *
 * Keyed the same way as ORG_OFFICE_CONTACT and ORG_DONATION_DEFAULTS: the
 * deployment tenant slug (`VITE_FRANCHISE_SLUG`) and the `ORG_NAME` preset key
 * both resolve to the same entry.
 *
 * The org key from `/api/config/public` wins over the env var, for the reason
 * spelled out in donationDefaults.ts: one build can serve several franchises,
 * and the config endpoint resolves the identity per request from the hostname
 * the visitor actually arrived on. `VITE_FRANCHISE_SLUG` is a build-time guess
 * and is only consulted when the config has not answered yet.
 */

const BAITHUZZAKATH_KEYS = ["bz", "baithuzzakath"];

/**
 * Whether the Zakat shortcut renders as a floating button instead of an icon
 * in the header action row.
 *
 * Baithuzzakath only: the header row there is already carrying the search,
 * donate and login controls, and the calculator was the one that pushed the
 * row past the edge on smaller laptops.
 */
export function usesFloatingZakatButton(orgKey?: string): boolean {
  const envSlug = (import.meta.env.VITE_FRANCHISE_SLUG as string | undefined)?.toLowerCase().trim();
  const key = ((orgKey || envSlug) ?? "").toLowerCase().trim();
  return BAITHUZZAKATH_KEYS.includes(key);
}
