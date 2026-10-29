const AWS = require('aws-sdk');
const fs = require('fs');
const { getOptionalEnvVar } = require('../config/validateEnv');
const { isImageMime, compressImageBuffer, renameForFormat } = require('../services/imageCompressionService');

// Configure AWS SDK for DigitalOcean Spaces
// All values must come from environment variables - no fallbacks
const spacesEndpointValue = getOptionalEnvVar('SPACES_ENDPOINT');
const regionValue = getOptionalEnvVar('REGION');
const bucketNameValue = getOptionalEnvVar('SPACES_BUCKET_NAME');

if (!spacesEndpointValue || !process.env.SPACES_ACCESS_KEY_ID || !process.env.SPACES_SECRET_ACCESS_KEY || !bucketNameValue) {
  throw new Error('DigitalOcean Spaces configuration incomplete. Required: SPACES_ENDPOINT, SPACES_ACCESS_KEY_ID, SPACES_SECRET_ACCESS_KEY, SPACES_BUCKET_NAME');
}

const spacesEndpoint = new AWS.Endpoint(spacesEndpointValue);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
  secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  region: regionValue || 'blr1'
});

const bucketName = bucketNameValue;

/**
 * Upload file to DigitalOcean Spaces
 * @param {Object} file - Multer file object
 * @param {string} folder - Folder path in bucket
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadToSpaces = async (file, folder = 'uploads', options = {}) => {
  try {
    if (!file) throw new Error('No file provided');

    let fileContent = file.buffer || fs.readFileSync(file.path);
    let contentType = file.mimetype;
    let originalName = file.originalname;
    let optimized = false;

    // Every image is compressed before it is stored (visually lossless — see
    // imageCompressionService). `compressImages: false` opts a caller out.
    if (options.compressImages !== false && isImageMime(contentType)) {
      const compressed = await compressImageBuffer(fileContent, contentType);
      if (compressed.changed) {
        fileContent = compressed.buffer;
        if (compressed.mimetype !== contentType.toLowerCase()) originalName = renameForFormat(originalName, compressed.ext);
        contentType = compressed.mimetype;
        optimized = true;
      }
    }

    const fileName = `${folder}/${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ACL: 'public-read',
      ContentType: contentType,
      CacheControl: 'max-age=31536000',
      // Tells scripts/compressStoredImages.js not to re-encode it.
      ...(optimized ? { Metadata: { optimized: '1' } } : {})
    };

    const result = await s3.upload(params).promise();

    // Clean up local file if exists
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      success: true,
      fileUrl: result.Location,
      key: result.Key,
      bucket: result.Bucket,
      size: fileContent.length
    };
  } catch (error) {
    console.error('❌ S3 Upload Error:', error);
    throw error;
  }
};

/**
 * Delete file from DigitalOcean Spaces
 * @param {string} fileKey - File key in bucket
 * @returns {Promise<boolean>} Success status
 */
const deleteFromSpaces = async (fileKey) => {
  try {
    if (!fileKey) return false;
    await s3.deleteObject({ Bucket: bucketName, Key: fileKey }).promise();
    return true;
  } catch (error) {
    console.error('❌ S3 Delete Error:', error);
    throw error;
  }
};

/**
 * Extract file key from full URL
 * @param {string} fileUrl - Full file URL
 * @returns {string} File key
 */
const extractKeyFromUrl = (fileUrl) => {
  try {
    if (!fileUrl) return '';
    const url = new URL(fileUrl);
    return url.pathname.substring(1);
  } catch (error) {
    return fileUrl;
  }
};

module.exports = {
  uploadToSpaces,
  deleteFromSpaces,
  extractKeyFromUrl,
  s3
};
