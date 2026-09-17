/**
 * Give the Contact Us page its contact block
 * ==========================================
 * seedSitePages.js deliberately never touches a page that already exists, so
 * a site that was seeded before the "Contact Block" section type existed still
 * has the old Contact Us page: one paragraph of text pointing at the footer.
 *
 * This script replaces that paragraph with the real thing — contact details
 * card on the left, message form on the right, location map underneath:
 *
 *   1. Adds a 'contact' section at the top of /p/contact-us, if it has none.
 *   2. Drops the placeholder "Get In Touch" richtext it replaces — but only
 *      that one, matched on the text seedSitePages.js wrote. A rewritten or
 *      hand-authored paragraph is left in place, moved below the new block.
 *   3. Sets the map embed when MAP_EMBED is passed, on a contact section that
 *      has none yet (admins can also paste it under Website → Pages).
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent. A page that already has a contact
 * section is left alone, and no other section is touched.
 *
 * Usage:
 *   node src/scripts/updateContactUsPage.js                 # franchise slug: bz
 *   FRANCHISE_SLUG=people node src/scripts/updateContactUsPage.js
 *   DRY_RUN=1 node src/scripts/updateContactUsPage.js       # report, change nothing
 *   MAP_EMBED='<iframe src="https://www.google.com/maps/embed?pb=…"></iframe>' \
 *     node src/scripts/updateContactUsPage.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Franchise = require('../models/Franchise');
const SitePage = require('../models/SitePage');

const FRANCHISE_SLUG = (process.env.FRANCHISE_SLUG || 'bz').toLowerCase().trim();
const DRY_RUN = !!process.env.DRY_RUN;
const MAP_EMBED = (process.env.MAP_EMBED || '').trim();

const CONTACT_SECTION = {
  type: 'contact',
  title: 'Get In Touch',
  subtitle:
    'For questions about Zakat, applications for assistance, or donation receipts, reach our office directly or send us a message.',
  icon: 'message-circle',
  ctaText: 'Send Message',
  mapEmbedUrl: '',
  items: []
};

/**
 * The paragraph seedSitePages.js used to write. Matched on its distinctive
 * second half — the sentence that sends readers to the footer for the address
 * the new block now shows directly — so an admin's own text never matches.
 */
const PLACEHOLDER = /shown in the footer of every page and are managed under Website Settings/i;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  console.log('✔ Connected to MongoDB');

  const franchise = await Franchise.findOne({ slug: FRANCHISE_SLUG }).lean();
  if (!franchise) {
    const available = await Franchise.find().select('slug').lean();
    console.error(`✖ No franchise with slug "${FRANCHISE_SLUG}". Available: ${available.map((f) => f.slug).join(', ') || '(none)'}`);
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log(`✔ Franchise: ${franchise.displayName || franchise.slug}`);
  if (DRY_RUN) console.log('  (dry run — nothing will be written)\n');

  const page = await SitePage.findOne({ slug: 'contact-us', franchise: franchise._id });
  if (!page) {
    console.error('✖ No /p/contact-us page for this franchise. Run seedSitePages.js first.');
    await mongoose.connection.close();
    process.exit(1);
  }

  const notes = [];
  const existing = (page.sections || []).find((s) => s.type === 'contact');

  if (existing) {
    console.log('  – /p/contact-us already has a contact block');
    if (MAP_EMBED && !(existing.mapEmbedUrl || '').trim()) {
      existing.mapEmbedUrl = MAP_EMBED;
      notes.push('set the location map');
    }
  } else {
    // Drop the placeholder paragraph the block replaces, then lead with it.
    const before = page.sections.length;
    page.sections = page.sections.filter((s) => !(s.type === 'richtext' && PLACEHOLDER.test(s.content || '')));
    if (page.sections.length < before) notes.push('removed the placeholder "Get In Touch" paragraph');

    page.sections.unshift({ ...CONTACT_SECTION, mapEmbedUrl: MAP_EMBED });
    notes.push(`added the contact block${MAP_EMBED ? ' with a location map' : ' (map left empty)'}`);
  }

  if (!notes.length) {
    console.log('\nNothing to do — the page is already up to date.');
    await mongoose.connection.close();
    return;
  }

  page.sections.forEach((s, i) => { s.order = i; });
  console.log('  /p/contact-us');
  notes.forEach((n) => console.log(`    – ${n}`));

  if (!DRY_RUN) {
    page.markModified('sections');
    await page.save();
  }

  console.log(`\nDone. The page ${DRY_RUN ? 'would be' : 'was'} updated.`);
  if (!MAP_EMBED) {
    console.log('Add the office location under Website → Pages → Contact Us → Contact Block → Location map.');
  }
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('✖ Failed:', err.message);
  try { await mongoose.connection.close(); } catch { /* already closed */ }
  process.exit(1);
});
