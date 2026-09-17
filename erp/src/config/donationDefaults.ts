import qrBaithuzzakath from "@/assets/qr.png";

export interface BankAccount {
  accountName?: string;
  accountNumber?: string;
  accountType?: string;
  bankName?: string;
  branch?: string;
  ifsc?: string;
}

export interface DonationDefaults {
  qrImageUrl?: string;
  accounts: BankAccount[];
  /** Number donors send transfer proof to, shown under the account list. */
  whatsapp?: string;
  email?: string;
}

/**
 * Built-in donate-card content, keyed by org.
 *
 * Keyed deliberately rather than exported as one shared default: this build is
 * multi-tenant (see ORG_PRESETS in api/src/config/orgConfig.js), and a global
 * fallback would print one org's bank accounts on every other org's site —
 * misdirecting real donations. An org with no entry here shows nothing until
 * its accounts are filled in under Website Settings → Donation, which always
 * takes precedence over anything below.
 */
const BAITHUZZAKATH: DonationDefaults = {
    qrImageUrl: qrBaithuzzakath,
    accounts: [
      {
        accountName: "BAITHUZZAKATH KERALA1",
        accountNumber: "13890100118107",
        accountType: "SBA",
        bankName: "FEDERAL BANK",
        branch: "S.M STREET",
        ifsc: "FDRL0001389",
      },
      {
        accountName: "BAITHUZZAKATH KERALA",
        accountNumber: "917010070927988",
        accountType: "SBA",
        bankName: "AXIS BANK",
        branch: "MAVOOR ROAD",
        ifsc: "UTIB0002916",
      },
    ],
  whatsapp: "8137811811",
  email: "baithuzzakathfinance@gmail.com",
};

export const ORG_DONATION_DEFAULTS: Record<string, DonationDefaults> = {
  // Deployment tenant slug (VITE_FRANCHISE_SLUG) …
  bz: BAITHUZZAKATH,
  // … and the ORG_NAME preset key, for builds that run without a franchise.
  baithuzzakath: BAITHUZZAKATH,
};

/**
 * Picks the donate-card defaults for this deployment.
 *
 * The org key from /api/config/public wins, because it is resolved per request
 * from the hostname the visitor actually came in on — the one identity that is
 * right even when a single build serves several franchises. VITE_FRANCHISE_SLUG
 * is only a build-time guess and is used solely as a fallback for builds that
 * load without config.
 *
 * (The precedence used to be the other way round, because the public config
 * endpoint reported the ORG_NAME env org's key on every cached response rather
 * than the resolved franchise's. With that fixed in
 * applicationConfigController.getPublicConfigs, the runtime identity is the
 * trustworthy one — and it has to win here, since the cost of getting it wrong
 * is one org's bank details and donation QR printed on another org's site.)
 *
 * A franchise with no entry gets nothing: the donate card then renders only
 * what that franchise saved under Website Settings → Donation, which is where
 * this content belongs.
 */
export function resolveDonationDefaults(orgKey?: string): DonationDefaults {
  const key = orgKey?.toLowerCase().trim();
  const envSlug = (import.meta.env.VITE_FRANCHISE_SLUG as string | undefined)?.toLowerCase().trim();
  if (key) return ORG_DONATION_DEFAULTS[key] || { accounts: [] };
  return (envSlug && ORG_DONATION_DEFAULTS[envSlug]) || { accounts: [] };
}
