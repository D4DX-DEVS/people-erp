const sharp = require('sharp');

const IMAGE_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif', 'image/tiff', 'image/heic', 'image/heif', 'image/avif'
]);

// Visually lossless settings. 2560px on the longest side covers a full-width
// hero on a high-density screen; quality 82 with mozjpeg / WebP is not
// distinguishable from the original at normal viewing. PNG stays lossless.
const MAX_DIMENSION = 2560;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;

/** Formats browsers can't show (or we don't keep): re-encoded as JPEG on upload. */
const CONVERT_TO_JPEG = new Set(['image/tiff', 'image/heic', 'image/heif', 'image/avif']);

/**
 * Returns true if the mimetype is a compressible image.
 */
function isImageMime(mimetype) {
  return IMAGE_MIMES.has((mimetype || '').toLowerCase());
}

/**
 * Compress an image buffer with sharp.
 * - Applies the EXIF orientation (phone photos), then drops the metadata.
 * - Shrinks to MAX_DIMENSION on the longest side; never enlarges.
 * - JPEG → mozjpeg, WebP → WebP, PNG → lossless PNG (max zlib effort).
 * - TIFF/HEIC/HEIF/AVIF → JPEG, unless `keepFormat` (stored files whose URL
 *   must keep working are returned unchanged instead).
 * - GIF, SVG, animated images and anything sharp can't read → returned as-is.
 * - When the result isn't smaller and the format didn't change, the original
 *   buffer is returned, so compressing never makes a file bigger.
 *
 * @param {Buffer} buffer     Original file buffer
 * @param {string} mimetype   Original mimetype (e.g. 'image/jpeg')
 * @param {{ keepFormat?: boolean }} [options]
 * @returns {Promise<{ buffer: Buffer, mimetype: string, ext: string, changed: boolean }>}
 */
async function compressImageBuffer(buffer, mimetype, options = {}) {
  const mime = (mimetype || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  const untouched = { buffer, mimetype: mime, ext: extFor(mime), changed: false };

  if (!isImageMime(mime) || mime === 'image/gif') return untouched;
  if (options.keepFormat && CONVERT_TO_JPEG.has(mime)) return untouched;

  try {
    const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
    if ((metadata.pages || 1) > 1) return untouched; // animated WebP/AVIF

    const image = sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

    let outMime;
    if (mime === 'image/png') {
      image.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 });
      outMime = 'image/png';
    } else if (mime === 'image/webp') {
      image.webp({ quality: WEBP_QUALITY, effort: 5 });
      outMime = 'image/webp';
    } else {
      image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
      outMime = 'image/jpeg';
    }

    const out = await image.toBuffer();
    const converted = outMime !== mime;
    if (!converted && out.length >= buffer.length) return untouched;
    return { buffer: out, mimetype: outMime, ext: extFor(outMime), changed: true };
  } catch (error) {
    console.warn('⚠️ Image compression skipped:', error.message);
    return untouched;
  }
}

function extFor(mime) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[mime]
    || (mime.split('/')[1] || 'bin');
}

/** Swap a filename's extension when compression changed the format (e.g. photo.heic → photo.jpg). */
function renameForFormat(name, ext) {
  return /\.[^./]+$/.test(name) ? name.replace(/\.[^./]+$/, `.${ext}`) : `${name}.${ext}`;
}

module.exports = { isImageMime, compressImageBuffer, renameForFormat, MAX_DIMENSION, JPEG_QUALITY, WEBP_QUALITY };
