const express = require('express');
const router = express.Router();
const fileUploadController = require('../controllers/fileUploadController');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const RBACMiddleware = require('../middleware/rbacMiddleware');

// Deleting stored files is destructive — restrict to holders of documents.delete
const canDeleteFiles = RBACMiddleware.hasPermission('documents.delete');

/**
 * @route   POST /api/upload/single
 * @desc    Upload a single file
 * @access  Private
 */
router.post('/single', 
  authenticate, 
  uploadSingle('file'), 
  (req, res) => fileUploadController.uploadSingle(req, res)
);

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', 
  authenticate, 
  uploadMultiple('files', 10), 
  (req, res) => fileUploadController.uploadMultiple(req, res)
);

/**
 * @route   POST /api/upload/form
 * @desc    Upload files for form builder
 * @access  Private
 */
router.post('/form', 
  authenticate, 
  uploadMultiple('files', 10), 
  (req, res) => fileUploadController.uploadFormFiles(req, res)
);

/**
 * @route   DELETE /api/upload/:fileKey
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/:fileKey(*)',
  authenticate,
  canDeleteFiles,
  (req, res) => fileUploadController.deleteFile(req, res)
);

/**
 * @route   POST /api/upload/delete-multiple
 * @desc    Delete multiple files
 * @access  Private
 */
router.post('/delete-multiple',
  authenticate,
  canDeleteFiles,
  (req, res) => fileUploadController.deleteMultiple(req, res)
);

/**
 * @route   GET /api/upload/metadata/:fileKey
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/metadata/:fileKey(*)', 
  authenticate, 
  (req, res) => fileUploadController.getMetadata(req, res)
);

/**
 * @route   GET /api/upload/list
 * @desc    List files in a folder
 * @access  Private
 */
router.get('/list', 
  authenticate, 
  (req, res) => fileUploadController.listFiles(req, res)
);

/**
 * @route   POST /api/upload/presigned-url
 * @desc    Generate presigned URL for temporary file access
 * @access  Private
 */
router.post('/presigned-url', 
  authenticate, 
  (req, res) => fileUploadController.getPresignedUrl(req, res)
);

module.exports = router;
