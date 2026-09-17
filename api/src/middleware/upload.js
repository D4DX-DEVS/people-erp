const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getEnvVar } = require('../config/validateEnv');

// Ensure upload directory exists - must come from environment
const uploadDir = getEnvVar('UPLOAD_PATH', 'File upload directory path');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer disk storage
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Multi-tenant: store in franchise-specific subdirectory
    const franchiseSlug = req.franchise?.slug || req.franchiseId?.toString() || 'global';
    const franchiseUploadDir = path.join(uploadDir, franchiseSlug);
    if (!fs.existsSync(franchiseUploadDir)) {
      fs.mkdirSync(franchiseUploadDir, { recursive: true });
    }
    cb(null, franchiseUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Configure multer memory storage (for S3/Spaces upload)
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Get allowed file types from environment - required, no defaults
  const allowedTypesStr = getEnvVar('ALLOWED_FILE_TYPES', 'Allowed file types');
  const allowedTypes = allowedTypesStr.split(',').map(type => type.trim().toLowerCase());

  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Get max file size from environment - required, no defaults
const maxFileSize = parseInt(getEnvVar('MAX_FILE_SIZE', 'Maximum file size in bytes'), 10);

// Configure multer with disk storage
const upload = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

// Configure multer with memory storage (for direct S3/Spaces upload)
const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds the limit of ${maxFileSize} bytes`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple files upload
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds the limit of ${maxFileSize} bytes`
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum allowed: ${maxCount}`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple fields with files
const uploadFields = (fields) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.fields(fields);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds the limit of ${maxFileSize} bytes`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for single file upload to memory (for S3/Spaces)
const uploadSingleMemory = (fieldName = 'file') => {
  return (req, res, next) => {
    const uploadMiddleware = uploadMemory.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds the limit of ${maxFileSize} bytes`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// ── Branding images ──────────────────────────────────────────────────────────
// Logos and favicons need SVG and WebP, which ALLOWED_FILE_TYPES deliberately
// omits — that list is document-oriented and shared by every other upload
// route, so widening it there would loosen validation everywhere. This
// middleware carries its own mime allowlist and its own (much smaller) size
// cap instead, and keeps the file in memory for the Spaces upload.
const BRANDING_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

const uploadBrandingImage = (fieldName = 'logo', maxBytes = 2 * 1024 * 1024) => {
  const brandingUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: maxBytes },
    fileFilter: (req, file, cb) => {
      if (BRANDING_IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Only PNG, JPG, SVG, WebP and ICO images are allowed'), false);
    },
  });

  return (req, res, next) => {
    brandingUpload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB`
          });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadMemory,
  uploadSingleMemory,
  uploadBrandingImage,
  BRANDING_IMAGE_MIMES,
  uploadMultipleMemory: (fieldName = 'files', maxCount = 50) => {
    return (req, res, next) => {
      const uploadMiddleware = uploadMemory.array(fieldName, maxCount);
      uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: `File size exceeds the limit of ${maxFileSize} bytes`
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: `Too many files. Maximum allowed: ${maxCount}`
            });
          }
          return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
          return res.status(400).json({ success: false, message: err.message });
        }
        next();
      });
    };
  }
};
