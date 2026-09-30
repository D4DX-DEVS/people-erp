/**
 * Backfill Application.submittedAt
 *
 * submittedAt is the moment the beneficiary clicked Submit. Applications
 * created before the field existed have none, and for draft-converted ones
 * createdAt is when the draft was started, not when it was submitted.
 *
 * Estimate per application (non-draft, submittedAt missing):
 *   1. Earliest "New application received" notification linked to it —
 *      written at submit time (used only if not earlier than createdAt)
 *   2. otherwise createdAt (exact for applications submitted without a draft)
 *
 * DRY RUN BY DEFAULT — nothing is written until you pass --apply.
 * Safe to re-run: only touches applications with no submittedAt.
 *
 * Run from the api directory:
 *   node src/scripts/backfillSubmittedAt.js            # preview
 *   node src/scripts/backfillSubmittedAt.js --apply    # write
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }
  const apply = process.argv.includes('--apply');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');
  console.log(`Mode: ${apply ? 'APPLY (writes)' : 'DRY RUN (no writes)'}\n`);

  const apps = await Application.find({
    status: { $ne: 'draft' },
    $or: [{ submittedAt: { $exists: false } }, { submittedAt: null }]
  })
    .select('applicationNumber createdAt')
    .setOptions({ bypassFranchise: true })
    .lean();
  console.log(`Applications without submittedAt: ${apps.length}`);

  const notifs = await Notification.aggregate([
    {
      $match: {
        title: 'New application received',
        'relatedEntities.application': { $in: apps.map(a => a._id) }
      }
    },
    { $group: { _id: '$relatedEntities.application', at: { $min: '$createdAt' } } }
  ]).option({ bypassFranchise: true });
  const notifAt = new Map(notifs.map(n => [String(n._id), n.at]));

  const ops = [];
  let fromNotification = 0;
  let fromCreatedAt = 0;
  for (const a of apps) {
    const n = notifAt.get(String(a._id));
    const useNotif = n && new Date(n) >= new Date(a.createdAt);
    const submittedAt = useNotif ? new Date(n) : a.createdAt;
    useNotif ? fromNotification++ : fromCreatedAt++;
    ops.push({ updateOne: { filter: { _id: a._id }, update: { $set: { submittedAt } } } });
  }
  console.log(`  from notification time : ${fromNotification}`);
  console.log(`  from createdAt         : ${fromCreatedAt}`);

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to commit.');
  } else if (ops.length) {
    const result = await Application.bulkWrite(ops, { timestamps: false, bypassFranchise: true });
    console.log(`\nUpdated ${result.modifiedCount} application(s).`);
  } else {
    console.log('\nNothing to update.');
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
