/**
 * One-shot backfill: give every RecurringPayment the `franchise` of its own
 * Application (falling back to its Scheme's).
 *
 * Recurring payments used to be generated without the tenant field, so every
 * franchise-scoped query (Budget page disbursed/pending totals, Consolidated
 * Reports, single-payment actions) silently skipped them. The generator now
 * sets it; this repairs the existing rows.
 *
 * Usage:
 *   node src/scripts/backfillRecurringPaymentFranchise.js          # dry run
 *   node src/scripts/backfillRecurringPaymentFranchise.js --apply  # write
 */
require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  const apply = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGODB_URI);
  const RecurringPayment = require('../models/RecurringPayment');
  const Application = require('../models/Application');
  const Scheme = require('../models/Scheme');

  const orphans = await RecurringPayment.find({ franchise: { $exists: false } })
    .select('_id paymentNumber application scheme')
    .setOptions({ bypassFranchise: true })
    .lean();

  const idsOf = field => [...new Set(orphans.map(p => p[field]?.toString()).filter(Boolean))];
  const [apps, schemes] = await Promise.all([
    Application.find({ _id: { $in: idsOf('application') } })
      .select('_id franchise').setOptions({ bypassFranchise: true }).lean(),
    Scheme.find({ _id: { $in: idsOf('scheme') } })
      .select('_id franchise').setOptions({ bypassFranchise: true }).lean()
  ]);
  const franchiseByApp = new Map(apps.map(a => [a._id.toString(), a.franchise]));
  const franchiseByScheme = new Map(schemes.map(s => [s._id.toString(), s.franchise]));

  let updated = 0;
  let skipped = 0;

  for (const payment of orphans) {
    const franchise = franchiseByApp.get(payment.application?.toString())
      || franchiseByScheme.get(payment.scheme?.toString());
    if (!franchise) {
      skipped++;
      console.log(`  skip ${payment._id} (#${payment.paymentNumber}) — no franchise on its application or scheme`);
      continue;
    }
    if (apply) {
      await RecurringPayment.updateOne({ _id: payment._id }, { $set: { franchise } });
    }
    updated++;
  }

  console.log(`\n${apply ? 'Updated' : 'Would update'} ${updated} recurring payment(s); skipped ${skipped}.`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
