const express = require('express');
const router = express.Router();
const projectPageController = require('../controllers/projectPageController');
const { authenticate, crossFranchiseResolver } = require('../middleware/auth');
const { hasAnyPermission } = require('../middleware/rbacMiddleware');

// Public
router.get('/public/:slug', projectPageController.getPublicBySlug);

// Protected (images are uploaded through POST /api/site-pages/upload-image)
router.use(authenticate);
router.use(crossFranchiseResolver);

router.get('/', hasAnyPermission(['website.read', 'website.write']), projectPageController.getAll);
// Registered before the /:projectId routes so "order" is not read as a project id.
router.put('/order', hasAnyPermission(['website.write']), projectPageController.reorder);
router.get('/:projectId', hasAnyPermission(['website.read', 'website.write']), projectPageController.getByProject);
router.put('/:projectId', hasAnyPermission(['website.write']), projectPageController.upsert);
router.delete('/:projectId', hasAnyPermission(['website.delete']), projectPageController.remove);

module.exports = router;
