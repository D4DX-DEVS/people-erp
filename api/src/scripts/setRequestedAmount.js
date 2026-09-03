/**
 * Bulk-set Application.requestedAmount
 *
 * Applications created through the public form never captured a requested
 * amount, so most sit at 0. This sets them to a flat figure (default
 * ₹1,00,000) so the amount columns, exports and PDFs are meaningful.
 *
 * DRY RUN BY DEFAULT — nothing is written until you pass --apply.
 *
 * Run from the api directory:
 *   node src/scripts/setRequestedAmount.js                    # preview
 *   node src/scripts/setRequestedAmount.js --apply            # write
 *
 * Options:
 *   --amount=100000        target amount (default 100000)
 *   --only-zero            only touch applications currently at 0
 *   --status=a,b,c         only these statuses (default: every status)
 *   --franchise=<id>       only this franchise
 *   --force                also overwrite where the new amount would fall
 *                          below an already-approved amount (unsafe)
 *
 * Applications whose approvedAmount exceeds the new figure are skipped by
 * default: approvedAmount must never exceed requestedAmount, and their
 * distributionTimeline instalments were generated from the old figure.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Application = require('../models/Application');

function arg(name, fallback = null) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}
const flag = name => process.argv.includes(`--${name}`);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const amount = Number(arg('amount', 100000));
  if (!Number.isFinite(amount) || amount < 0) {
    console.error(`Invalid --amount: ${arg('amount')}`);
    process.exit(1);
  }
  const apply = flag('apply');
  const force = flag('force');

  const filter = {};
  if (flag('only-zero')) filter.requestedAmount = 0;
  const statuses = arg('status');
  if (statuses) filter.status = { $in: statuses.split(',').map(s => s.trim()).filter(Boolean) };
  const franchise = arg('franchise');
  if (franchise) filter.franchise = new mongoose.Types.ObjectId(franchise);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  console.log(`Mode      : ${apply ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  console.log(`Amount    : ${amount}`);
  console.log(`Filter    : ${JSON.stringify(filter)}\n`);

  const candidates = await Application.find(filter)
    .select('applicationNumber status requestedAmount approvedAmount franchise')
    .setOptions({ bypassFranchise: true })
    .lean();

  const unchanged = candidates.filter(a => a.requestedAmount === amount);
  const blocked = force ? [] : candidates.filter(
    a => a.requestedAmount !== amount && (a.approvedAmount || 0) > amount
  );
  const blockedIds = new Set(blocked.map(a => String(a._id)));
  const targets = candidates.filter(
    a => a.requestedAmount !== amount && !blockedIds.has(String(a._id))
  );

  console.log(`Matched   : ${candidates.length}`);
  console.log(`Already at ${amount}: ${unchanged.length}`);
  console.log(`To update : ${targets.length}`);
  console.log(`Skipped (approvedAmount > ${amount}): ${blocked.length}\n`);

  if (blocked.length) {
    console.log('Skipped — approved for more than the new amount:');
    blocked.forEach(a => console.log(
      `  ${a.applicationNumber}  ${String(a.status).padEnd(22)} requested ${a.requestedAmount} → approved ${a.approvedAmount}`
    ));
    console.log('  (re-run with --force to overwrite these anyway)\n');
  }

  const byStatus = {};
  targets.forEach(a => {
    const key = `${a.status} (from ${a.requestedAmount})`;
    byStatus[key] = (byStatus[key] || 0) + 1;
  });
  console.log('Updates by status:');
  Object.entries(byStatus).sort().forEach(([k, n]) => console.log(`  ${k.padEnd(40)} x ${n}`));

  const notFromZero = targets.filter(a => a.requestedAmount !== 0);
  if (notFromZero.length) {
    console.log('\nOverwriting a non-zero amount:');
    notFromZero.forEach(a => console.log(
      `  ${a.applicationNumber}  ${String(a.status).padEnd(22)} ${a.requestedAmount} → ${amount}`
    ));
  }

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to commit.');
    await mongoose.disconnect();
    return;
  }

  if (!targets.length) {
    console.log('\nNothing to update.');
    await mongoose.disconnect();
    return;
  }

  const result = await Application.updateMany(
    { _id: { $in: targets.map(a => a._id) } },
    { $set: { requestedAmount: amount } },
    { bypassFranchise: true }
  );
  console.log(`\nUpdated ${result.modifiedCount} application(s).`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
