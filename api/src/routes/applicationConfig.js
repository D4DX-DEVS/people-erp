const express = require('express');
const router = express.Router();
const applicationConfigController = require('../controllers/applicationConfigController');
const { authenticate, crossFranchiseResolver, authorize } = require('../middleware/auth');
const { hasAnyPermission } = require('../middleware/rbacMiddleware');
const { uploadBrandingImage } = require('../middleware/upload');

/**
 * Test route to verify public routes work
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Public route works!' });
});

/**
 * Public route - Get public configurations
 * No authentication required
 */
router.get('/public', applicationConfigController.getPublicConfigs);

/**
 * @route   POST /api/config/logo?variant=primary|footer|favicon
 * @desc    Upload a logo for the caller's franchise (stored per franchise, so
 *          each franchise on this deployment brands itself)
 * @access  Private (settings.write)
 */
router.post(
  '/logo',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.write', 'settings.write']),
  uploadBrandingImage('logo'),
  applicationConfigController.uploadLogo
);

/**
 * @route   DELETE /api/config/logo?variant=primary|footer|favicon
 * @desc    Remove one of the franchise's logos, reverting to the default
 * @access  Private (settings.write)
 */
router.delete(
  '/logo',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.write', 'settings.write']),
  applicationConfigController.deleteLogo
);

/**
 * Protected routes - Require authentication and permissions
 */

// Get all configurations (Admin only)
router.get(
  '/',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.read', 'settings.read']),
  applicationConfigController.getAllConfigs
);

// Get single configuration by ID (Admin only)
router.get(
  '/:id',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.read', 'settings.read']),
  applicationConfigController.getConfigById
);

// Create new configuration (Admin only)
router.post(
  '/',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.write', 'settings.write']),
  applicationConfigController.createConfig
);

// Update single configuration (Admin only)
router.put(
  '/:id',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.write', 'settings.write']),
  applicationConfigController.updateConfig
);

// Bulk update configurations (Admin only)
router.put(
  '/bulk/update',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.write', 'settings.write']),
  applicationConfigController.bulkUpdateConfigs
);

// Delete configuration (Admin only)
router.delete(
  '/:id',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['config.write', 'settings.write']),
  applicationConfigController.deleteConfig
);

// ── Per-franchise Integrations (DXing SMS + SMTP Email) ──────────────────
// Only the franchise super_admin (or global super admin) may read/write these.

router.get(
  '/integrations',
  authenticate, crossFranchiseResolver,
  authorize('super_admin'),
  applicationConfigController.getIntegrationsConfig
);

router.put(
  '/integrations',
  authenticate, crossFranchiseResolver,
  authorize('super_admin'),
  applicationConfigController.updateIntegrationsConfig
);

module.exports = router;
