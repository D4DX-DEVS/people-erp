const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');
const { authenticate, crossFranchiseResolver } = require('../middleware/auth');
const { hasAnyPermission } = require('../middleware/rbacMiddleware');
const { uploadSingleMemory } = require('../middleware/upload');

// Public
router.get('/public', testimonialController.getPublic);

// Protected
router.use(authenticate);
router.use(crossFranchiseResolver);

router.get('/', hasAnyPermission(['website.read', 'website.write']), testimonialController.getAll);
router.post('/', hasAnyPermission(['website.write']), uploadSingleMemory('photo'), testimonialController.create);
router.put('/:id', hasAnyPermission(['website.write']), uploadSingleMemory('photo'), testimonialController.update);
router.delete('/:id', hasAnyPermission(['website.delete']), testimonialController.remove);

module.exports = router;
