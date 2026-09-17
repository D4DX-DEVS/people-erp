/**
 * Sync Franchise Branding Script
 * ==============================
 * Pushes the ORG_PRESETS branding in orgConfig.js onto the franchise records:
 * the three logo slots, the site colour palette and the home page's hero style.
 * Franchise rows seeded earlier pick up changed branding without re-running the
 * full franchise seed (which also touches roles, website settings and domains).
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent, and it never overwrites a choice an
 * admin has made in the UI:
 *   • a logo slot with a storage key was uploaded through the admin UI → skipped
 *   • a palette already set under Website Settings → Colours → skipped
 *   • a hero style already chosen under Website Settings → Hero → skipped
 * Pass --force to overwrite those too.
 *
 * It prints the before/after value for everything it touches.
 *
 * Usage:
 *   node src/scripts/syncFranchiseBranding.js
 *   node src/scripts/syncFranchiseBranding.js --dry-run     # report only, no writes
 *   node src/scripts/syncFranchiseBranding.js --force       # also replace admin choices
 *   node src/scripts/syncFranchiseBranding.js --only=site   # colours + hero style only
 *   node src/scripts/syncFranchiseBranding.js --only=logos  # logo slots only
 *
 * --only=site is what to run when the database is ahead of the deployed API:
 * logo URLs point at files in src/assets, so writing them before that code ships
 * leaves every logo 404ing until it does. Colours and hero style carry no such
 * dependency.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/environment');
const { ORG_PRESETS } = require('../config/orgConfig');
const Franchise = require('../models/Franchise');
const WebsiteSettings = require('../models/WebsiteSettings');

// Franchise slug → the orgConfig preset that owns its branding. Mirrors the
// mapping in seedFranchises.js.
const SLUG_TO_ORG_KEY = {
  people: 'people_foundation',
  bz: 'baithuzzakath',
};

// Logo slot → the preset field holding its filename, and the pair of fields it
// writes on the franchise. A set key means the file came from an admin upload.
const LOGO_SLOTS = [
  { label: 'logo',        presetField: 'logoFilename',       urlField: 'logoUrl',       keyField: 'logoKey' },
  { label: 'footer logo', presetField: 'footerLogoFilename', urlField: 'footerLogoUrl', keyField: 'footerLogoKey' },
  { label: 'favicon',     presetField: 'faviconFilename',    urlField: 'faviconUrl',    keyField: 'faviconKey' },
];

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || 'all';
if (!['all', 'site', 'logos'].includes(ONLY)) {
  console.error(`❌ --only must be one of: site, logos (got "${ONLY}")`);
  process.exit(1);
}
const DO_LOGOS = ONLY === 'all' || ONLY === 'logos';
const DO_SITE = ONLY === 'all' || ONLY === 'site';

async function syncLogos(franchise, preset) {
  let changed = 0;

  for (const slot of LOGO_SLOTS) {
    const filename = preset[slot.presetField];
    if (!filename) continue;

    if (franchise[slot.keyField] && !FORCE) {
      console.log(`     ⏭  ${slot.label}: uploaded from the admin UI — left untouched`);
      continue;
    }

    const url = `/api/assets/${filename}`;
    if (franchise[slot.urlField] === url) {
      console.log(`     ✓  ${slot.label}: already ${filename}`);
      continue;
    }

    console.log(`     →  ${slot.label}: ${franchise[slot.urlField] || '(unset)'} → ${url}`);
    franchise[slot.urlField] = url;
    // The file now lives in the deploy's assets, not object storage, so the
    // stale key must go with it or the next upload would try to delete a file
    // that no longer backs this slot.
    franchise[slot.keyField] = '';
    changed++;
  }

  // logoFilename backs the server-side PDF header, which reads from disk.
  if (preset.logoFilename && franchise.logoFilename !== preset.logoFilename) {
    console.log(`     →  logoFilename: ${franchise.logoFilename || '(unset)'} → ${preset.logoFilename}`);
    franchise.logoFilename = preset.logoFilename;
    changed++;
  }

  if (changed && !DRY_RUN) await franchise.save();
  return changed;
}

async function syncSite(franchise, preset) {
  const settings = await WebsiteSettings.findOne({ franchise: franchise._id });
  if (!settings) {
    console.log('     ⚠️  no website settings record — run npm run franchise:seed first');
    return 0;
  }

  // Schema defaults materialise on a loaded document, so `settings.hero.style`
  // reads as 'illustrated' whether an admin picked it or the field was never
  // written at all. The lean copy shows what is actually stored, which is the
  // only way to tell an admin's choice from an untouched record.
  const stored = await WebsiteSettings.findById(settings._id)
    .select('hero.style appearance')
    .setOptions({ bypassFranchise: true })   // a maintenance script runs outside any request's tenant scope
    .lean();

  let changed = 0;

  // ── Colours ────────────────────────────────────────────────────────────────
  const colors = preset.brandColors;
  if (colors) {
    const current = stored?.appearance || {};
    const alreadySet = Boolean(current.primaryColor || current.gradientColor);

    if (alreadySet && !FORCE &&
        (current.primaryColor !== colors.primary || current.gradientColor !== colors.gradient)) {
      console.log(`     ⏭  colours: set in the admin UI (${current.primaryColor || '—'} / ${current.gradientColor || '—'}) — left untouched`);
    } else if (current.primaryColor === colors.primary && current.gradientColor === colors.gradient) {
      console.log(`     ✓  colours: already ${colors.primary} / ${colors.gradient}`);
    } else {
      console.log(`     →  colours: ${current.primaryColor || '(default)'} / ${current.gradientColor || '(default)'} → ${colors.primary} / ${colors.gradient}`);
      settings.appearance = { primaryColor: colors.primary, gradientColor: colors.gradient };
      changed++;
    }
  }

  // ── Hero style ─────────────────────────────────────────────────────────────
  if (preset.heroStyle) {
    const current = stored?.hero?.style;
    if (current && current !== preset.heroStyle && !FORCE) {
      console.log(`     ⏭  hero style: chosen in the admin UI (${current}) — left untouched`);
    } else if (current === preset.heroStyle) {
      console.log(`     ✓  hero style: already ${current}`);
    } else {
      console.log(`     →  hero style: ${current || '(unset)'} → ${preset.heroStyle}`);
      settings.hero = { ...(settings.hero?.toObject?.() || settings.hero || {}), style: preset.heroStyle };
      changed++;
    }
  }

  if (changed && !DRY_RUN) await settings.save();
  return changed;
}

async function syncFranchiseBranding() {
  await mongoose.connect(config.MONGODB_URI);
  const scope = ONLY === 'all' ? 'logos, colours and hero style' : ONLY === 'site' ? 'colours and hero style' : 'logos';
  console.log(`\n${DRY_RUN ? '🔍 DRY RUN — no writes' : '✏️  Syncing franchise branding'} (${scope})${FORCE ? ' (FORCE — admin choices will be replaced)' : ''}\n`);

  let changed = 0;

  for (const [slug, orgKey] of Object.entries(SLUG_TO_ORG_KEY)) {
    const preset = ORG_PRESETS[orgKey];
    console.log(`  ${slug}:`);

    if (!preset) {
      console.log(`     ⚠️  no preset for org key "${orgKey}" — skipped`);
      continue;
    }

    const franchise = await Franchise.findOne({ slug });
    if (!franchise) {
      console.log('     ⚠️  no franchise record — run npm run franchise:seed first');
      continue;
    }

    if (DO_LOGOS) changed += await syncLogos(franchise, preset);
    if (DO_SITE) changed += await syncSite(franchise, preset);
    console.log('');
  }

  console.log(`${DRY_RUN ? 'Would apply' : 'Applied'} ${changed} change(s).\n`);
  await mongoose.disconnect();
}

syncFranchiseBranding().catch(err => {
  console.error('❌ Branding sync failed:', err);
  process.exit(1);
});
