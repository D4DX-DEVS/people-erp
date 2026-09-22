/**
 * Franchise Logo Service
 * ======================
 * Per-franchise branding images. Every franchise owns its own logo files, so
 * two franchises served by the same deployment never share a mark — which is
 * exactly what the bundled `@/assets/logo.png` import used to force.
 *
 * Files go to Spaces (the same store partner logos use) rather than
 * `api/src/assets/`: that directory is baked into the deploy artifact, so a
 * file written there is lost on the next release and is invisible to any other
 * server instance.
 *
 * Both admin surfaces call through here — the franchise's own Settings page
 * (`POST /api/config/logo`) and the platform super admin managing any
 * franchise (`POST /api/global/franchises/:id/logo`).
 */

const Franchise = require('../models/Franchise');
const franchiseCache = require('../utils/franchiseCache');
const { uploadToSpaces, deleteFromSpaces } = require('../utils/s3Upload');

// variant → the pair of fields on the Franchise document it writes.
const LOGO_VARIANTS = {
  primary: {
    urlField: 'logoUrl',
    keyField: 'logoKey',
    label: 'Primary logo',
    description: 'Header, login screen, ERP shell and public site navbar',
  },
  footer: {
    urlField: 'footerLogoUrl',
    keyField: 'footerLogoKey',
    label: 'Footer logo',
    description: 'Light-on-dark lockup for the site footer band',
  },
  favicon: {
    urlField: 'faviconUrl',
    keyField: 'faviconKey',
    label: 'Favicon',
    description: 'Browser tab icon',
  },
};

const VARIANT_KEYS = Object.keys(LOGO_VARIANTS);

class LogoError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Resolve and validate a variant name, defaulting to the primary logo. */
function resolveVariant(variant) {
  const key = (variant || 'primary').toString().trim().toLowerCase();
  if (!LOGO_VARIANTS[key]) {
    throw new LogoError(`Unknown logo variant "${key}". Expected one of: ${VARIANT_KEYS.join(', ')}`);
  }
  return { key, ...LOGO_VARIANTS[key] };
}

/**
 * Store an uploaded image as one of a franchise's logos.
 * Replaces (and deletes) whatever that slot held before.
 *
 * @param {Object}  args
 * @param {string}  args.franchiseId
 * @param {string}  args.variant       primary | footer | favicon
 * @param {Object}  args.file          multer memory-storage file
 * @returns {Promise<{variant: string, url: string, franchise: Object}>}
 */
async function setFranchiseLogo({ franchiseId, variant, file }) {
  if (!franchiseId) {
    throw new LogoError('No franchise context — cannot tell which franchise this logo belongs to', 400);
  }
  if (!file) throw new LogoError('No logo file provided');

  const slot = resolveVariant(variant);

  const franchise = await Franchise.findById(franchiseId);
  if (!franchise) throw new LogoError('Franchise not found', 404);

  const upload = await uploadToSpaces(file, `franchises/${franchise.slug}/branding`, {});

  // Drop the file this one replaces, but only once the new one is safely
  // stored — and never fail the request over a stale object left behind.
  const previousKey = franchise[slot.keyField];
  if (previousKey && previousKey !== upload.key) {
    try {
      await deleteFromSpaces(previousKey);
    } catch (err) {
      console.error(`⚠ Could not delete superseded ${slot.key} logo (${previousKey}):`, err.message);
    }
  }

  franchise[slot.urlField] = upload.fileUrl;
  franchise[slot.keyField] = upload.key;
  await franchise.save();

  // The branding object is cached for 10 minutes; without this the admin
  // uploads a logo and the site keeps serving the old one.
  franchiseCache.invalidateFranchise(franchise);

  return { variant: slot.key, url: upload.fileUrl, franchise };
}

/**
 * Clear one of a franchise's logo slots, so it falls back to the default.
 *
 * @param {Object} args
 * @param {string} args.franchiseId
 * @param {string} args.variant
 * @returns {Promise<{variant: string, franchise: Object}>}
 */
async function clearFranchiseLogo({ franchiseId, variant }) {
  if (!franchiseId) {
    throw new LogoError('No franchise context — cannot tell which franchise this logo belongs to', 400);
  }

  const slot = resolveVariant(variant);

  const franchise = await Franchise.findById(franchiseId);
  if (!franchise) throw new LogoError('Franchise not found', 404);

  const key = franchise[slot.keyField];
  if (key) {
    try {
      await deleteFromSpaces(key);
    } catch (err) {
      console.error(`⚠ Could not delete ${slot.key} logo (${key}):`, err.message);
    }
  }

  franchise[slot.urlField] = '';
  franchise[slot.keyField] = '';
  await franchise.save();

  franchiseCache.invalidateFranchise(franchise);

  return { variant: slot.key, franchise };
}

/** The logo URLs currently set on a franchise, keyed by variant. */
function readFranchiseLogos(franchise) {
  return VARIANT_KEYS.reduce((acc, key) => {
    acc[key] = franchise?.[LOGO_VARIANTS[key].urlField] || '';
    return acc;
  }, {});
}

module.exports = {
  LOGO_VARIANTS,
  VARIANT_KEYS,
  LogoError,
  resolveVariant,
  setFranchiseLogo,
  clearFranchiseLogo,
  readFranchiseLogos,
};
