/**
 * Prune dangling application references from beneficiaries
 *
 * A beneficiary keeps its submitted applications in an `applications` array.
 * When applications are removed outside the normal delete path (e.g. straight
 * from the database), those ids stay behind and keep blocking the two guards
 * that rely on them: deleting the beneficiary, and converting the number into
 * an admin.
 *
 * This script drops only the ids whose Application document no longer exists.
 *
 * Run from the api directory:
 *   node src/scripts/pruneDanglingBeneficiaryApplications.js            # report only, all beneficiaries
 *   node src/scripts/pruneDanglingBeneficiaryApplications.js --apply    # fix all beneficiaries
 *   node src/scripts/pruneDanglingBeneficiaryApplications.js --phone 9605543366 --apply
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Beneficiary = require('../models/Beneficiary');
const Application = require('../models/Application');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const apply = process.argv.includes('--apply');
  const phoneIdx = process.argv.indexOf('--phone');
  const phone = phoneIdx !== -1 ? String(process.argv[phoneIdx + 1] || '').replace(/\D/g, '').slice(-10) : null;

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY RUN'}${phone ? ` | phone: ${phone}` : ' | all beneficiaries'}`);

  const filter = { applications: { $exists: true, $ne: [] } };
  if (phone) filter.phone = phone;

  const beneficiaries = await Beneficiary.find(filter).select('name phone franchise applications isDeleted').lean();
  console.log(`Beneficiaries with applications: ${beneficiaries.length}`);

  let affected = 0;
  let pruned = 0;

  for (const b of beneficiaries) {
    const ids = (b.applications || []).map(String);
    const existing = await Application.find({ _id: { $in: ids } }).select('_id').lean();
    const existingIds = new Set(existing.map((a) => String(a._id)));
    const dangling = ids.filter((id) => !existingIds.has(id));
    if (dangling.length === 0) continue;

    affected += 1;
    pruned += dangling.length;
    console.log(`- ${b.name} (${b.phone}) franchise=${b.franchise}: ${dangling.length} dangling of ${ids.length} -> ${dangling.join(', ')}`);

    if (apply) {
      await Beneficiary.updateOne(
        { _id: b._id },
        { $set: { applications: ids.filter((id) => existingIds.has(id)) } }
      );
    }
  }

  console.log(`\n${apply ? 'Pruned' : 'Would prune'} ${pruned} reference(s) across ${affected} beneficiary(ies).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
