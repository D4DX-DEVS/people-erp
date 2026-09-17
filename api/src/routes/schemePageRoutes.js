const express = require('express');
const router = express.Router();
const schemePageController = require('../controllers/schemePageController');
const { authenticate, crossFranchiseResolver } = require('../middleware/auth');
const { hasAnyPermission } = require('../middleware/rbacMiddleware');

// Public
router.get('/public/:slug', schemePageController.getPublicBySlug);

// Protected (images are uploaded through POST /api/site-pages/upload-image)
router.use(authenticate);
router.use(crossFranchiseResolver);

router.get('/', hasAnyPermission(['website.read', 'website.write']), schemePageController.getAll);
router.get('/:schemeId', hasAnyPermission(['website.read', 'website.write']), schemePageController.getByScheme);
router.put('/:schemeId', hasAnyPermission(['website.write']), schemePageController.upsert);
router.delete('/:schemeId', hasAnyPermission(['website.delete']), schemePageController.remove);

module.exports = router;
