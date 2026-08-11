const express = require('express');
const router = express.Router();
const sitePageController = require('../controllers/sitePageController');
const { authenticate, crossFranchiseResolver } = require('../middleware/auth');
const { hasAnyPermission } = require('../middleware/rbacMiddleware');
const { uploadSingleMemory } = require('../middleware/upload');

// Public
router.get('/public', sitePageController.getPublicList);
router.get('/public/:slug', sitePageController.getPublicBySlug);

// Protected
router.use(authenticate);
router.use(crossFranchiseResolver);

router.get('/', hasAnyPermission(['website.read', 'website.write']), sitePageController.getAll);
router.get('/:id', hasAnyPermission(['website.read', 'website.write']), sitePageController.getById);
router.post('/', hasAnyPermission(['website.write']), sitePageController.create);
router.put('/:id', hasAnyPermission(['website.write']), sitePageController.update);
router.delete('/:id', hasAnyPermission(['website.delete']), sitePageController.remove);
router.post('/upload-image', hasAnyPermission(['website.write']), uploadSingleMemory('image'), sitePageController.uploadImage);

module.exports = router;
