/**
 * One-shot backfill: give every Payment the `franchise` of its own Application.
 *
 * Payments used to be created without the tenant field, so franchise-scoped
 * lookups (receipt download, payment detail) could not find them and returned
 * 404. All creation paths now set it; this repairs the existing rows.
 *
 * Usage:
 *   node src/scripts/backfillPaymentFranchise.js          # dry run
 *   node src/scripts/backfillPaymentFranchise.js --apply  # write
 */
require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  const apply = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGODB_URI);
  const Payment = require('../models/Payment');
  const Application = require('../models/Application');

  const orphans = await Payment.find({ franchise: { $exists: false } })
    .select('_id paymentNumber application')
    .setOptions({ bypassFranchise: true })
    .lean();

  const appIds = [...new Set(orphans.map(p => p.application?.toString()).filter(Boolean))];
  const apps = await Application.find({ _id: { $in: appIds } })
    .select('_id franchise')
    .setOptions({ bypassFranchise: true })
    .lean();
  const franchiseByApp = new Map(apps.map(a => [a._id.toString(), a.franchise]));

  let updated = 0;
  let skipped = 0;

  for (const payment of orphans) {
    const franchise = franchiseByApp.get(payment.application?.toString());
    if (!franchise) {
      skipped++;
      console.log(`  skip ${payment.paymentNumber} — its application has no franchise`);
      continue;
    }
    if (apply) {
      await Payment.updateOne({ _id: payment._id }, { $set: { franchise } });
    }
    updated++;
  }

  console.log(`\n${apply ? 'Updated' : 'Would update'} ${updated} payment(s); skipped ${skipped}.`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
