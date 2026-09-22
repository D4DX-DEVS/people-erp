/**
 * Update the footer copyright holder in place
 * ===========================================
 * orgConfig.js now names the Baithuzzakath copyright holder "Baithuzzakath
 * Kerala", but a deployment that already ran seedFranchises.js keeps its own
 * copy of that string: the seed preserves existing franchise settings on
 * re-run, so the preset change alone never reaches a live database. This
 * script carries the rename to the two records the public footer actually
 * reads, in the order the footer consults them:
 *
 *   1. WebsiteSettings.footer.copyrightText — the admin-editable override.
 *   2. Franchise.copyrightHolder            — what org.copyrightText is built
 *                                             from when no override is set.
 *                                             (Note the top-level field, not
 *                                             settings.copyrightHolder: that
 *                                             one is not on the settings
 *                                             subschema, so strict mode has
 *                                             always dropped it on write.)
 *
 * Only values that still say the old name are touched: anything an admin has
 * since written by hand, and anything already carrying "Kerala", is left as
 * it is. Nothing is deleted.
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent.
 *
 * Usage:
 *   node src/scripts/updateFooterCopyright.js                  # franchise slug: bz
 *   FRANCHISE_SLUG=people node src/scripts/updateFooterCopyright.js
 *   DRY_RUN=1 node src/scripts/updateFooterCopyright.js        # report, change nothing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Franchise = require('../models/Franchise');
const WebsiteSettings = require('../models/WebsiteSettings');

const FRANCHISE_SLUG = (process.env.FRANCHISE_SLUG || 'bz').toLowerCase().trim();
const DRY_RUN = !!process.env.DRY_RUN;

const OLD_HOLDER = 'Baithuzzakath';
const NEW_HOLDER = 'Baithuzzakath Kerala';

/**
 * True only for a value that names the old holder and has not already been
 * renamed — "Baithuzzakath Kerala" must not match, or a second run would
 * append "Kerala" again.
 */
const needsRename = (value) =>
  !!value && value.includes(OLD_HOLDER) && !value.includes(NEW_HOLDER);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Add it to api/.env');
  await mongoose.connect(uri);
  console.log(`✅ Connected to MongoDB: ${uri.replace(/\/\/.*@/, '//***@')}\n`);
  if (DRY_RUN) console.log('DRY RUN — nothing will be written.\n');

  const franchise = await Franchise.findOne({ slug: FRANCHISE_SLUG });
  if (!franchise) {
    console.log(`No franchise with slug "${FRANCHISE_SLUG}". Nothing to do.`);
    await mongoose.connection.close();
    return;
  }
  console.log(`─── Franchise: ${franchise.slug} (${franchise.displayName}) ───`);

  let changed = 0;

  // 1. The admin override on Website Settings wins in the footer, so it has to
  //    be renamed first — leaving it behind would mask the franchise change.
  const settings = await WebsiteSettings.findOne({ franchise: franchise._id });
  const override = settings?.footer?.copyrightText;
  if (needsRename(override)) {
    const next = override.replace(OLD_HOLDER, NEW_HOLDER);
    console.log(`  footer.copyrightText: "${override}"\n                     → "${next}"`);
    if (!DRY_RUN) {
      settings.footer.copyrightText = next;
      settings.markModified('footer');
      await settings.save();
    }
    changed += 1;
  } else if (override) {
    console.log(`  footer.copyrightText already reads "${override}" — left alone`);
  }

  // 2. The franchise holder, which the copyrightLine virtual — and so
  //    org.copyrightText — is derived from. displayName is the fallback the
  //    virtual uses, and is left untouched: it is the short label the header,
  //    menus and page titles all show.
  const holder = franchise.copyrightHolder || franchise.displayName;
  if (needsRename(holder)) {
    const next = holder.replace(OLD_HOLDER, NEW_HOLDER);
    console.log(`  copyrightHolder: "${holder}" → "${next}"`);
    if (!DRY_RUN) {
      franchise.copyrightHolder = next;
      await franchise.save();
    }
    changed += 1;
  } else {
    console.log(`  copyrightHolder already reads "${holder}" — left alone`);
  }

  console.log(
    changed
      ? `\nDone. ${changed} field(s) ${DRY_RUN ? 'would change' : 'updated'}.`
      : '\nEverything was already up to date.',
  );
  console.log('The footer line can also be edited under Website → Settings → Footer.');
  if (changed && !DRY_RUN) console.log('Restart the API so the franchise branding cache picks this up.');
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('✖ Failed:', err.message);
  try { await mongoose.connection.close(); } catch { /* already closed */ }
  process.exit(1);
});
