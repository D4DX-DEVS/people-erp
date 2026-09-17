/**
 * Update the About Us page in place
 * =================================
 * seedSitePages.js deliberately never touches a page that already exists, so
 * it cannot deliver corrections to a site that has already been seeded. This
 * script applies exactly three changes to the live records:
 *
 *   1. About Us is titled "Baithuzzakath Kerala" (page title, hero and SEO).
 *   2. Every richtext / image-text section on every site page has its HTML
 *      markup stripped — the public renderer treats `content` as plain text,
 *      so tags were showing up verbatim on the page.
 *   3. About Us gains a "Vision & Mission" section, if it has none already.
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent, and it only rewrites the fields
 * listed above. Any other admin edit (sections you added, reordering, images)
 * is left alone. Nothing is deleted.
 *
 * Usage:
 *   node src/scripts/updateAboutUsPage.js                  # franchise slug: bz
 *   FRANCHISE_SLUG=people node src/scripts/updateAboutUsPage.js
 *   DRY_RUN=1 node src/scripts/updateAboutUsPage.js        # report, change nothing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Franchise = require('../models/Franchise');
const SitePage = require('../models/SitePage');

const FRANCHISE_SLUG = (process.env.FRANCHISE_SLUG || 'bz').toLowerCase().trim();
const DRY_RUN = !!process.env.DRY_RUN;

const ABOUT_TITLE = 'Baithuzzakath Kerala';

const VISION_MISSION = {
  type: 'cards',
  title: 'Vision & Mission',
  subtitle: 'Where we are headed, and what we do every day to get there.',
  columns: 2,
  background: 'muted',
  items: [
    {
      title: 'Our Vision',
      icon: 'eye',
      order: 0,
      description:
        'A Kerala where no eligible family is left without the Zakat that is their right — and where giving it is simple, ' +
        'trustworthy and dignified for donor and recipient alike.'
    },
    {
      title: 'Our Mission',
      icon: 'target',
      order: 1,
      description:
        'To collect Zakat faithfully and distribute it to verified beneficiaries through a transparent, accountable process ' +
        'that favours lasting change — livelihoods, housing, healthcare and education — over one-off relief.'
    }
  ]
};

const hasMarkup = (text) => /<\/?[a-z][^>]*>/i.test(String(text || ''));

/** Mirror of toParagraphs() in erp/src/components/site/PageSections.tsx. */
function stripHtml(text) {
  return String(text || '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n');
}

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

  const pages = await SitePage.find({ franchise: franchise._id });
  let changed = 0;

  for (const page of pages) {
    const notes = [];

    // 2. Strip markup from text bodies on every page, not just About Us.
    (page.sections || []).forEach((section) => {
      if (!['richtext', 'image-text'].includes(section.type)) return;
      if (!hasMarkup(section.content)) return;
      section.content = stripHtml(section.content);
      notes.push(`stripped HTML from "${section.title || section.type}"`);
    });

    if (page.slug === 'about-us') {
      // 1. Title, hero and SEO title.
      if (page.title !== ABOUT_TITLE) {
        page.title = ABOUT_TITLE;
        notes.push(`title → "${ABOUT_TITLE}"`);
      }
      if (page.hero && page.hero.title !== ABOUT_TITLE) {
        page.hero.title = ABOUT_TITLE;
        notes.push('hero title updated');
      }
      if (page.seo && page.seo.title && page.seo.title !== ABOUT_TITLE) {
        page.seo.title = ABOUT_TITLE;
        notes.push('SEO title updated');
      }

      // 3. Vision & Mission, inserted after the first section and only when the
      //    page has nothing like it already (so a hand-written one survives).
      const already = (page.sections || []).some((s) =>
        /vision|mission/i.test(s.title || '') ||
        (s.items || []).some((i) => /vision|mission/i.test(i.title || ''))
      );
      if (!already) {
        const insertAt = Math.min(1, page.sections.length);
        page.sections.splice(insertAt, 0, { ...VISION_MISSION });
        page.sections.forEach((s, i) => { s.order = i; });
        notes.push('added "Vision & Mission" section');
      }
    }

    if (!notes.length) continue;
    changed += 1;
    console.log(`  /p/${page.slug}`);
    notes.forEach((n) => console.log(`    – ${n}`));
    if (!DRY_RUN) {
      page.markModified('sections');
      await page.save();
    }
  }

  console.log(`\nDone. ${changed} page(s) ${DRY_RUN ? 'would be' : ''} updated${DRY_RUN ? '' : '.'}`);
  if (!changed) console.log('Everything was already up to date.');
  console.log('Edit any of this under Website → Pages in the admin.');
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('✖ Failed:', err.message);
  try { await mongoose.connection.close(); } catch { /* already closed */ }
  process.exit(1);
});
