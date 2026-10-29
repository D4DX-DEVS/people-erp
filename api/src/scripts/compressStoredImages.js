/**
 * Compress Stored Images
 * ======================
 * Recompresses every image this app references in DigitalOcean Spaces, in
 * place: same key, so every stored URL keeps working. Uses the same visually
 * lossless settings as new uploads (services/imageCompressionService).
 *
 * How images are found: every collection (except the log collections) is
 * scanned for URLs on our bucket — plain fields (imageUrl, coverImageUrl,
 * logoUrl…) and <img src> inside rich-text HTML alike — so nothing that a page
 * shows is missed and nothing another project keeps in the shared bucket is
 * touched.
 *
 * Safety:
 *  - Dry run by default: downloads and measures, writes nothing.
 *  - --apply: before overwriting, the original is copied to `_originals/<key>`
 *    (private). `--restore` copies every backup back.
 *  - Never changes format; GIF/SVG/HEIC/animated images are left alone; a
 *    file is only replaced when it shrinks by at least MIN_SAVING.
 *  - Replaced objects get `x-amz-meta-optimized: 1`, so reruns skip them
 *    (re-encoding a JPEG twice would only lose quality).
 *
 * Usage (from api/):
 *   node src/scripts/compressStoredImages.js            # dry run + report
 *   node src/scripts/compressStoredImages.js --apply    # compress in place
 *   node src/scripts/compressStoredImages.js --restore  # put the originals back
 *   options: --concurrency=4 --limit=N
 *            --skip-prefix=people-erp/   leave keys under a prefix alone (repeatable;
 *                                        people-erp/ holds application document uploads)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { s3 } = require('../utils/s3Upload');
const { compressImageBuffer } = require('../services/imageCompressionService');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore');
const argNum = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? Math.max(1, parseInt(hit.split('=')[1], 10) || fallback) : fallback;
};
const CONCURRENCY = argNum('concurrency', 4);
const LIMIT = argNum('limit', Infinity);
const SKIP_PREFIXES = args.filter(a => a.startsWith('--skip-prefix=')).map(a => a.split('=')[1]).filter(Boolean);

const BUCKET = process.env.SPACES_BUCKET_NAME;
const ENDPOINT_HOST = String(process.env.SPACES_ENDPOINT || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const CDN_HOST = String(process.env.SPACES_CDN_ENDPOINT || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const BACKUP_PREFIX = '_originals/';
const MIN_SAVING = 0.05; // replace only when at least 5% smaller

const SKIP_COLLECTIONS = new Set(['activity_logs', 'login_logs', 'error_logs']);
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const fmt = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Bucket key for a URL on our bucket (virtual-hosted, CDN or path-style), else null. */
function keyFromUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  const host = url.hostname.toLowerCase();
  let key = null;
  if (host === `${BUCKET}.${ENDPOINT_HOST}`.toLowerCase() || (CDN_HOST && host === CDN_HOST.toLowerCase())) {
    key = url.pathname.slice(1);
  } else if (host === ENDPOINT_HOST.toLowerCase() && url.pathname.startsWith(`/${BUCKET}/`)) {
    key = url.pathname.slice(BUCKET.length + 2);
  }
  if (!key) return null;
  try { return decodeURIComponent(key); } catch { return key; }
}

/** Walk every string in a document, collecting bucket image keys and other image references. */
function collectFromValue(value, found, where) {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) { found.inline.add(where); return; }
    const urls = value.match(/https?:\/\/[^\s"'<>)\\]+/g);
    if (!urls) return;
    urls.forEach((u) => {
      const key = keyFromUrl(u);
      if (key) {
        if (IMAGE_EXT.test(key)) {
          if (!found.keys.has(key)) found.keys.set(key, new Set());
          found.keys.get(key).add(where);
        }
      } else if (IMAGE_EXT.test(u.split('?')[0])) {
        found.external.add(u);
      }
    });
  } else if (Array.isArray(value)) {
    value.forEach(v => collectFromValue(v, found, where));
  } else if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value) && !(value._bsontype)) {
    Object.values(value).forEach(v => collectFromValue(v, found, where));
  }
}

async function scanDatabase() {
  const db = mongoose.connection.db;
  const found = { keys: new Map(), external: new Set(), inline: new Set() };
  const collections = (await db.listCollections().toArray()).map(c => c.name).filter(n => !SKIP_COLLECTIONS.has(n));
  for (const name of collections) {
    const cursor = db.collection(name).find({});
    for await (const doc of cursor) collectFromValue(doc, found, name);
  }
  return found;
}

/** Run `worker` over `items` with a fixed number in flight. */
async function pool(items, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }));
}

async function isPublic(key) {
  try {
    const acl = await s3.getObjectAcl({ Bucket: BUCKET, Key: key }).promise();
    return (acl.Grants || []).some(g => g.Permission === 'READ' && /AllUsers/.test((g.Grantee && g.Grantee.URI) || ''));
  } catch {
    return true; // every app upload is public-read; keep it that way when the ACL can't be read
  }
}

async function compressAll() {
  console.log(`\n🔎 Scanning the database for images on ${BUCKET}…`);
  const found = await scanDatabase();
  const keys = [...found.keys.keys()].filter(k => !SKIP_PREFIXES.some(p => k.startsWith(p))).slice(0, LIMIT);
  if (SKIP_PREFIXES.length) console.log(`   Skipping keys under: ${SKIP_PREFIXES.join(', ')}`);
  console.log(`   ${found.keys.size} distinct images referenced on the bucket${LIMIT < Infinity ? ` (processing first ${keys.length})` : ''}.`);

  const report = { mode: APPLY ? 'apply' : 'dry-run', startedAt: new Date().toISOString(), compressed: [], kept: [], skipped: [], missing: [], failed: [] };
  let before = 0;
  let after = 0;

  await pool(keys, async (key, i) => {
    const tag = `[${i + 1}/${keys.length}]`;
    try {
      let head;
      try {
        head = await s3.headObject({ Bucket: BUCKET, Key: key }).promise();
      } catch (e) {
        if (e.code === 'NotFound' || e.statusCode === 404) { report.missing.push({ key, usedIn: [...found.keys.get(key)] }); return; }
        throw e;
      }
      if (head.Metadata && head.Metadata.optimized === '1') { report.skipped.push({ key, reason: 'already optimized', size: head.ContentLength }); return; }

      const obj = await s3.getObject({ Bucket: BUCKET, Key: key }).promise();
      const ext = (key.split('.').pop() || '').toLowerCase();
      const mime = (obj.ContentType && obj.ContentType.startsWith('image/')) ? obj.ContentType : MIME_BY_EXT[ext];
      const original = obj.Body;
      const result = await compressImageBuffer(original, mime, { keepFormat: true });
      const saving = result.changed ? 1 - result.buffer.length / original.length : 0;

      before += original.length;
      if (!result.changed || result.mimetype !== mime.replace('image/jpg', 'image/jpeg') || saving < MIN_SAVING) {
        after += original.length;
        report.kept.push({ key, size: original.length, reason: result.changed ? `only ${(saving * 100).toFixed(1)}% smaller` : 'already compact or unsupported' });
        return;
      }
      after += result.buffer.length;
      report.compressed.push({ key, from: original.length, to: result.buffer.length });
      console.log(`${tag} ${key}  ${fmt(original.length)} → ${fmt(result.buffer.length)} (-${Math.round(saving * 100)}%)`);

      if (!APPLY) return;
      const acl = (await isPublic(key)) ? 'public-read' : 'private';
      // Backup first: the original is kept privately under _originals/.
      await s3.copyObject({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
        Key: `${BACKUP_PREFIX}${key}`,
        ACL: 'private',
        MetadataDirective: 'COPY'
      }).promise();
      await s3.putObject({
        Bucket: BUCKET,
        Key: key,
        Body: result.buffer,
        ACL: acl,
        ContentType: mime,
        CacheControl: obj.CacheControl || 'max-age=31536000',
        Metadata: { ...(obj.Metadata || {}), optimized: '1', 'original-size': String(original.length) }
      }).promise();
    } catch (error) {
      report.failed.push({ key, error: error.message });
      console.warn(`${tag} ✗ ${key}: ${error.message}`);
    }
  });

  report.finishedAt = new Date().toISOString();
  report.totals = { referenced: found.keys.size, processedBytesBefore: before, processedBytesAfter: after };
  report.notOnBucket = { externalImageUrls: [...found.external], inlineBase64In: [...found.inline] };

  const logsDir = path.join(__dirname, '../../logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const file = path.join(logsDir, `image-compression-${report.mode}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  console.log(`\n${APPLY ? '✅ Applied' : '📋 Dry run (nothing written)'}`);
  console.log(`   Compressed: ${report.compressed.length} · kept as is: ${report.kept.length} · already optimized: ${report.skipped.length} · missing on bucket: ${report.missing.length} · failed: ${report.failed.length}`);
  console.log(`   Size: ${fmt(before)} → ${fmt(after)}${before ? ` (-${Math.round((1 - after / before) * 100)}%)` : ''}`);
  if (found.external.size) console.log(`   ${found.external.size} image URL(s) on other hosts (not ours to compress).`);
  if (found.inline.size) console.log(`   Inline base64 images found in: ${[...found.inline].join(', ')} (stored in the database, not on the bucket — not changed).`);
  console.log(`   Report: ${file}`);
  if (!APPLY && report.compressed.length) console.log('\n   Run again with --apply to compress them in place (originals are backed up to _originals/).');
}

async function restoreAll() {
  console.log(`\n♻️  Restoring originals from ${BUCKET}/${BACKUP_PREFIX}…`);
  const backups = [];
  let token;
  do {
    const page = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: BACKUP_PREFIX, ContinuationToken: token }).promise();
    (page.Contents || []).forEach(o => backups.push(o.Key));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  console.log(`   ${backups.length} backups found.`);
  await pool(backups, async (backupKey) => {
    const key = backupKey.slice(BACKUP_PREFIX.length);
    const head = await s3.headObject({ Bucket: BUCKET, Key: backupKey }).promise();
    await s3.copyObject({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${encodeURIComponent(backupKey).replace(/%2F/g, '/')}`,
      Key: key,
      ACL: 'public-read',
      ContentType: head.ContentType,
      CacheControl: head.CacheControl || 'max-age=31536000',
      Metadata: head.Metadata || {},
      MetadataDirective: 'REPLACE'
    }).promise();
    console.log(`   restored ${key}`);
  });
  console.log('✅ Restore complete. Backups were left in place.');
}

(async () => {
  if (!BUCKET || !ENDPOINT_HOST) throw new Error('SPACES_BUCKET_NAME / SPACES_ENDPOINT are not set');
  if (RESTORE) {
    await restoreAll();
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await compressAll();
  } finally {
    await mongoose.disconnect();
  }
})().catch((error) => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
