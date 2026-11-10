/**
 * Sync Mongo Migration
 * ====================
 * Verifies (and optionally syncs) the `people-erp` database copied from
 * MONGODB_URI (old cluster) to MONGODB_URI_NEW (new cluster). The bulk copy
 * itself is done with mongodump/mongorestore; this script proves it is exact
 * and closes the gap left by writes that keep landing on the old cluster.
 *
 * Checks: collection set + options, index specs, and every document
 * byte-for-byte (sha256 of its raw BSON), matched by _id.
 *
 * Usage (from api/):
 *   node src/scripts/syncMongoMigration.js            verify only (exit 2 on any diff)
 *   node src/scripts/syncMongoMigration.js --fix      BEFORE cutover: make new an exact mirror
 *                                                     (upsert missing/different, delete new-only docs)
 *   node src/scripts/syncMongoMigration.js --catchup  AFTER cutover: copy docs that exist only on
 *                                                     the old cluster; never overwrites or deletes
 *
 * Re-written docs keep their exact BSON types (Int32/Int64/Double/Binary/RegExp).
 */
require('dotenv').config();
const crypto = require('crypto');
const { MongoClient, BSON } = require('mongodb');

const DB = 'people-erp';
const FIX = process.argv.includes('--fix');
const CATCHUP = process.argv.includes('--catchup');
const EXACT = { promoteLongs: false, promoteValues: false, promoteBuffers: false, bsonRegExp: true };

const idKey = (id) => BSON.EJSON.stringify(id, { relaxed: false });

async function hashMap(coll) {
  const map = new Map();
  for await (const buf of coll.find({}, { raw: true })) {
    if (!(buf instanceof Uint8Array)) throw new Error('raw mode not active');
    const doc = BSON.deserialize(buf, EXACT);
    map.set(idKey(doc._id), { h: crypto.createHash('sha256').update(buf).digest('hex'), id: doc._id });
  }
  return map;
}

const normIndexes = (list) =>
  list
    .map(({ v, ns, ...rest }) => rest)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => BSON.EJSON.stringify(i, { relaxed: false }));

async function copyDocs(sColl, tColl, ids, upsert) {
  for (let i = 0; i < ids.length; i += 500) {
    const ops = [];
    for await (const buf of sColl.find({ _id: { $in: ids.slice(i, i + 500) } }, { raw: true })) {
      const doc = BSON.deserialize(buf, EXACT);
      ops.push(upsert
        ? { replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }
        : { insertOne: { document: doc } });
    }
    if (ops.length) await tColl.bulkWrite(ops, { ordered: false });
  }
}

async function run() {
  if (FIX && CATCHUP) throw new Error('use --fix (before cutover) or --catchup (after), not both');
  const src = new MongoClient(process.env.MONGODB_URI);
  const dst = new MongoClient(process.env.MONGODB_URI_NEW);
  await Promise.all([src.connect(), dst.connect()]);
  const sdb = src.db(DB);
  const tdb = dst.db(DB);

  const sColls = (await sdb.listCollections().toArray()).sort((a, b) => a.name.localeCompare(b.name));
  const tColls = await tdb.listCollections().toArray();
  const tByName = new Map(tColls.map((c) => [c.name, c]));
  const problems = [];
  let totalSrc = 0;
  let totalDst = 0;

  for (const c of tColls) {
    if (!sColls.find((s) => s.name === c.name)) problems.push(`EXTRA collection in new: ${c.name}`);
  }

  for (const sc of sColls) {
    const { name } = sc;
    const tc = tByName.get(name);
    if (!tc) {
      problems.push(`MISSING collection in new: ${name}`);
      continue;
    }
    if (sc.type !== tc.type) problems.push(`${name}: type ${sc.type} vs ${tc.type}`);
    if (BSON.EJSON.stringify(sc.options || {}) !== BSON.EJSON.stringify(tc.options || {})) {
      problems.push(`${name}: options differ`);
    }
    const sIdx = normIndexes(await sdb.collection(name).indexes());
    const tIdx = normIndexes(await tdb.collection(name).indexes());
    if (sIdx.join('\n') !== tIdx.join('\n')) {
      problems.push(`${name}: indexes differ\n   old=${sIdx.join(' | ')}\n   new=${tIdx.join(' | ')}`);
    }

    const [sMap, tMap] = await Promise.all([hashMap(sdb.collection(name)), hashMap(tdb.collection(name))]);
    totalSrc += sMap.size;
    totalDst += tMap.size;
    const missing = [];
    const different = [];
    const extra = [];
    for (const [k, v] of sMap) {
      const t = tMap.get(k);
      if (!t) missing.push(v.id);
      else if (t.h !== v.h) different.push(v.id);
    }
    for (const [k, v] of tMap) if (!sMap.has(k)) extra.push(v.id);

    const ok = !missing.length && !different.length && !extra.length;
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${name.padEnd(28)} old=${String(sMap.size).padStart(6)} new=${String(tMap.size).padStart(6)}`
      + (ok ? '' : `  missing=${missing.length} different=${different.length} extra=${extra.length}`));
    if (ok) continue;
    problems.push(`${name}: missing=${missing.length} different=${different.length} extra=${extra.length}`);

    if (FIX) {
      await copyDocs(sdb.collection(name), tdb.collection(name), [...missing, ...different], true);
      if (extra.length) await tdb.collection(name).deleteMany({ _id: { $in: extra } });
      console.log(`     fixed: upserted ${missing.length + different.length}, deleted ${extra.length}`);
    } else if (CATCHUP && missing.length) {
      await copyDocs(sdb.collection(name), tdb.collection(name), missing, false);
      console.log(`     caught up: inserted ${missing.length}`);
    }
  }

  console.log(`\nTOTAL docs  old=${totalSrc}  new=${totalDst}  collections old=${sColls.length} new=${tColls.length}`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    problems.forEach((p) => console.log(` - ${p}`));
  } else {
    console.log('\nALL MATCH: every collection, index, option and document is byte-identical.');
  }
  await Promise.all([src.close(), dst.close()]);
  return problems.length && !FIX && !CATCHUP ? 2 : 0;
}

run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
