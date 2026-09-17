export interface OfficeContact {
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Office contact details per deployment, keyed the same way as the donation
 * defaults (VITE_FRANCHISE_SLUG, then the ORG_NAME preset key).
 *
 * These exist because the public config endpoint builds its org payload from
 * the franchise record, and a franchise saved with blank contact settings sends
 * empty strings — which blank out the real values from ORG_PRESETS rather than
 * falling back to them. Anything entered under Website Settings → Contact
 * Details still wins over everything here.
 */
const BAITHUZZAKATH: OfficeContact = {
  address: "Baithuzzakath Bhavan, Kozhikode, Kerala - 673001",
};

export const ORG_OFFICE_CONTACT: Record<string, OfficeContact> = {
  bz: BAITHUZZAKATH,
  baithuzzakath: BAITHUZZAKATH,
};

export function resolveOfficeContact(orgKey?: string): OfficeContact {
  const envSlug = (import.meta.env.VITE_FRANCHISE_SLUG as string | undefined)?.toLowerCase().trim();
  return (
    (envSlug && ORG_OFFICE_CONTACT[envSlug]) ||
    (orgKey && ORG_OFFICE_CONTACT[orgKey.toLowerCase().trim()]) ||
    {}
  );
}
