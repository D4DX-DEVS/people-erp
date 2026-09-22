/**
 * Seed Site Pages Script
 * ======================
 * Creates the public website pages that menu items and "Learn More" buttons
 * link to (/p/<slug>). Without these records those links 404, because the page
 * system is CMS-driven and starts empty.
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent. An existing page with the same slug
 * is left completely untouched, so admin edits are never overwritten.
 *
 * Usage:
 *   node src/scripts/seedSitePages.js            # default franchise slug: bz
 *   FRANCHISE_SLUG=people node src/scripts/seedSitePages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Franchise = require('../models/Franchise');
const SitePage = require('../models/SitePage');

const FRANCHISE_SLUG = (process.env.FRANCHISE_SLUG || 'bz').toLowerCase().trim();

// Content below is deliberately generic where a fact would otherwise have to be
// invented (board names, registration numbers, office hours). Those spots say
// so plainly rather than inventing something that reads as authoritative.
const PAGES = [
  {
    slug: 'about-us',
    title: 'Baithuzzakath Kerala',
    navLabel: 'About Us',
    navOrder: 1,
    showInNav: false,
    showOnHome: true,
    homeOrder: 1,
    summary: 'Who we are, how we work, and the principles that guide our Zakat distribution.',
    seo: {
      title: 'Baithuzzakath Kerala',
      description: 'Baithuzzakath Kerala is a Zakat institution working across Kerala to collect and distribute Zakat transparently.'
    },
    hero: {
      title: 'Baithuzzakath Kerala',
      subtitle: 'Collecting and distributing Zakat with transparency since 2000.'
    },
    sections: [
      {
        type: 'richtext',
        title: 'Who We Are',
        order: 0,
        content:
          'Baithuzzakath Kerala is a Zakat institution with a network across the state. Since 2000 we have worked to collect Zakat and place it directly in the hands of those entitled to receive it, reducing poverty and helping families rebuild their livelihoods.\n\nWe strive for a just and compassionate society through initiatives that are transparent, accountable and measurable. Every rupee received is treated as a trust.'
      },
      {
        type: 'cards',
        title: 'Vision & Mission',
        subtitle: 'Where we are headed, and what we do every day to get there.',
        columns: 2,
        background: 'muted',
        order: 1,
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
      },
      {
        type: 'cards',
        title: 'How We Work',
        subtitle: 'Four principles behind every decision we take.',
        columns: 4,
        background: 'default',
        order: 2,
        items: [
          { title: 'Transparency', description: 'Collections and distributions are recorded and reported, so donors can see where their Zakat goes.', icon: 'eye', order: 0 },
          { title: 'Accountability', description: 'Every application is verified in the field before any assistance is approved.', icon: 'badge-check', order: 1 },
          { title: 'Dignity', description: 'Support is delivered privately and respectfully. Beneficiaries are never put on display.', icon: 'hand-heart', order: 2 },
          { title: 'Impact', description: 'We favour help that lasts — livelihoods, housing and education over one-off relief.', icon: 'trending-up', order: 3 }
        ]
      },
      {
        type: 'cta',
        title: 'Support our work',
        subtitle: 'Your Zakat reaches families who have been verified and are waiting.',
        ctaText: 'Donate Now',
        ctaLink: '/#donate',
        background: 'primary',
        order: 3
      }
    ]
  },
  {
    slug: 'about-zakat',
    title: 'About Zakat',
    navLabel: 'About Zakat',
    navOrder: 2,
    showInNav: false,
    showOnHome: false,
    summary: 'What Zakat is, who must pay it, and how the amount is worked out.',
    seo: {
      title: 'About Zakat',
      description: 'Understand Zakat: the nisab threshold, the 2.5% rate, which assets count, and who may receive it.'
    },
    hero: {
      title: 'Understanding Zakat',
      subtitle: 'The third pillar of Islam — a due, not a donation.'
    },
    sections: [
      {
        type: 'richtext',
        title: 'What Is Zakat?',
        order: 0,
        content:
          'Zakat is an obligation on every Muslim whose wealth reaches the nisab threshold and has been held for one lunar year. It is not charity given at will — it is a fixed right that the poor hold over the wealth of those who have enough.\n\nThe standard rate is 2.5% of net zakatable assets: what you own, less what you owe.'
      },
      {
        type: 'cards',
        title: 'What Counts As Zakatable',
        columns: 3,
        background: 'muted',
        order: 1,
        items: [
          { title: 'Cash & Bank Balances', description: 'Money held in hand, in current or savings accounts, and in deposits.', icon: 'landmark', order: 0 },
          { title: 'Gold & Silver', description: 'Jewellery, coins and bullion, valued at the current market rate.', icon: 'coins', order: 1 },
          { title: 'Business Assets', description: 'Stock held for sale, receivables, and cash held in the business.', icon: 'briefcase', order: 2 },
          { title: 'Investments', description: 'Shares, funds and similar holdings that can be converted to cash.', icon: 'bar-chart-3', order: 3 },
          { title: 'Liabilities', description: 'Debts due are deducted before Zakat is calculated.', icon: 'file-text', order: 4 },
          { title: 'Excluded', description: 'Your home, personal vehicle and everyday belongings are not zakatable.', icon: 'home', order: 5 }
        ]
      },
      {
        type: 'cta',
        title: 'Work out what you owe',
        subtitle: 'Our calculator estimates your Zakat in a few steps.',
        ctaText: 'Open the Zakat Calculator',
        ctaLink: '/#calculator',
        background: 'primary',
        order: 2
      }
    ]
  },
  {
    slug: 'board-of-directors',
    title: 'Board of Directors',
    navLabel: 'Board of Directors',
    navOrder: 3,
    showInNav: false,
    showOnHome: false,
    summary: 'The governing body responsible for oversight of our Zakat collection and distribution.',
    seo: { title: 'Board of Directors', description: 'The governing body of Baithuzzakath Kerala.' },
    hero: {
      title: 'Board of Directors',
      subtitle: 'Governance, oversight and accountability.'
    },
    sections: [
      {
        type: 'richtext',
        title: 'Governance',
        order: 0,
        content:
          'Our Board is responsible for the governance of the institution: approving policy, overseeing the verification and distribution process, and ensuring that Zakat funds are handled in line with Shariah requirements and statutory obligations.\n\nThe Board meets regularly and reviews collection, disbursement and audit reports.'
      },
      {
        // Left empty on purpose: member names and photographs are not something
        // this script can invent. Add them under Website → Pages → Board of
        // Directors, where each entry takes a name, role and photograph.
        type: 'team',
        title: 'Our Members',
        subtitle: 'Add each board member — name, role and photograph — from the admin page builder.',
        columns: 3,
        order: 1,
        items: []
      }
    ]
  },
  {
    slug: 'contact-us',
    title: 'Contact Us',
    navLabel: 'Contact Us',
    navOrder: 4,
    showInNav: false,
    showOnHome: false,
    summary: 'Reach our office, or find the branch nearest to you.',
    seo: { title: 'Contact Us', description: 'Get in touch with Baithuzzakath Kerala.' },
    hero: { title: 'Contact Us', subtitle: 'We would be glad to hear from you.' },
    sections: [
      {
        // Details card (left) + message form (right) + location map (below).
        // The details are read live from Website Settings → Contact Details;
        // the map stays empty until an admin pastes an embed for the office.
        type: 'contact',
        title: 'Get In Touch',
        subtitle:
          'For questions about Zakat, applications for assistance, or donation receipts, reach our office directly or send us a message.',
        icon: 'message-circle',
        ctaText: 'Send Message',
        mapEmbedUrl: '',
        items: [],
        order: 0
      },
      {
        type: 'cta',
        title: 'Want to volunteer?',
        subtitle: 'Join hands with us and help reach more families.',
        ctaText: 'Become a Volunteer',
        ctaLink: '/#volunteer',
        background: 'primary',
        order: 1
      }
    ]
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    navLabel: 'Terms & Conditions',
    navOrder: 90,
    showInNav: false,
    showOnHome: false,
    summary: 'The terms governing use of this website and donations made through it.',
    seo: { title: 'Terms & Conditions', description: 'Terms governing use of this website.' },
    hero: { title: 'Terms & Conditions', subtitle: '' },
    sections: [
      {
        type: 'richtext',
        order: 0,
        content:
          'Please have these terms reviewed by your legal adviser before publishing. The text below is a starting point only.' +
          '<h3>Use of this website</h3>' +
          'By using this website you agree to use it lawfully and not in any way that may damage or impair its availability to others.' +
          '<h3>Donations</h3>' +
          'Donations made through this website are applied to our Zakat and welfare programmes. Donations are voluntary and, once processed, are generally non-refundable. If you believe a payment was made in error, contact us and we will review it.' +
          '<h3>Accuracy of information</h3>' +
          'We take care to keep the information on this site current, but we do not warrant that it is complete or error-free at all times.' +
          '<h3>Changes</h3>' +
          'We may update these terms from time to time. The version published here is the one in force.'
      }
    ]
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    navLabel: 'Disclaimer',
    navOrder: 91,
    showInNav: false,
    showOnHome: false,
    summary: 'Limits on the information and tools provided on this website.',
    seo: { title: 'Disclaimer', description: 'Disclaimer for this website and its Zakat calculator.' },
    hero: { title: 'Disclaimer', subtitle: '' },
    sections: [
      {
        type: 'richtext',
        order: 0,
        content:
          'Please have this reviewed by your legal adviser before publishing. The text below is a starting point only.' +
          '<h3>Zakat calculator</h3>' +
          'The calculator on this site provides an estimate only. Gold and silver rates used are approximate and may not reflect the market on the day you calculate. Your Zakat obligation depends on your own circumstances — please consult a qualified scholar for a ruling specific to you.' +
          '<h3>General information</h3>' +
          'Content on this site is provided for general information and does not constitute religious, legal or financial advice.' +
          '<h3>External links</h3>' +
          'This site links to third-party websites. We are not responsible for their content or their privacy practices.'
      }
    ]
  }
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✖ MONGODB_URI is not set. Add it to api/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✔ Connected to MongoDB');

  const franchise = await Franchise.findOne({ slug: FRANCHISE_SLUG }).lean();
  if (!franchise) {
    const available = await Franchise.find().select('slug displayName').lean();
    console.error(`✖ No franchise with slug "${FRANCHISE_SLUG}".`);
    console.error('  Available:', available.map((f) => f.slug).join(', ') || '(none — run seedFranchises.js first)');
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log(`✔ Franchise: ${franchise.displayName || franchise.slug} (${franchise._id})`);

  let created = 0;
  let skipped = 0;

  for (const page of PAGES) {
    const existing = await SitePage.findOne({ slug: page.slug, franchise: franchise._id }).lean();
    if (existing) {
      console.log(`  – /p/${page.slug} already exists (${existing.status}) — left untouched`);
      skipped += 1;
      continue;
    }
    await SitePage.create({
      ...page,
      status: 'published',
      franchise: franchise._id
    });
    console.log(`  ✚ /p/${page.slug} created and published`);
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} already present.`);
  console.log('Edit any of them under Website → Pages in the admin.');
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('✖ Failed:', err.message);
  try { await mongoose.connection.close(); } catch { /* already closed */ }
  process.exit(1);
});
