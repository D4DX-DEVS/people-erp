const express = require('express');
const router = express.Router();
const newsEventController = require('../controllers/newsEventController');
const { authenticate, crossFranchiseResolver } = require('../middleware/auth');
const { hasAnyPermission } = require('../middleware/rbacMiddleware');
const { uploadSingleMemory } = require('../middleware/upload');

/**
 * @route   GET /api/news-events/public
 * @desc    Get public news/events (published only)
 * @access  Public
 */
router.get('/public', newsEventController.getPublic);

/**
 * @route   GET /api/news-events/public/:id
 * @desc    Get a single published news/event
 * @access  Public
 */
// The '/:id' route below is written to be public — it only authenticates when
// a token is supplied — but it can never be reached anonymously: app.js mounts
// formConfigurationRoutes at bare '/api' with a blanket router.use(authenticate),
// which gates every route registered after it. A '/public/' segment is how the
// rest of the site's read endpoints escape that (see the allowlist in
// middleware/auth.js), so the public news page asks for the story here.
// getById already restricts anonymous callers to published items.
router.get('/public/:id', newsEventController.getById);

/**
 * @route   GET /api/news-events
 * @desc    Get all news/events
 * @access  Private (super_admin, state_admin, or website.read permission)
 */
router.get('/',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['website.read', 'news.read']),
  newsEventController.getAll
);

/**
 * @route   GET /api/news-events/:id
 * @desc    Get single news/event
 * @access  Public
 */
// Authenticate when a token is supplied so admins can view drafts;
// anonymous visitors only get published items (enforced in the controller).
router.get('/:id',
  (req, res, next) => (req.headers.authorization ? authenticate(req, res, next) : next()),
  newsEventController.getById
);

/**
 * @route   POST /api/news-events
 * @desc    Create news/event
 * @access  Private (super_admin, state_admin, or website.write permission)
 */
router.post('/',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['website.write', 'news.write']),
  uploadSingleMemory('image'),
  newsEventController.create
);

/**
 * @route   PUT /api/news-events/:id
 * @desc    Update news/event
 * @access  Private (super_admin, state_admin, or website.write permission)
 */
router.put('/:id',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['website.write', 'news.write']),
  uploadSingleMemory('image'),
  newsEventController.update
);

/**
 * @route   DELETE /api/news-events/:id
 * @desc    Delete news/event
 * @access  Private (super_admin, state_admin, or website.delete permission)
 */
router.delete('/:id',
  authenticate, crossFranchiseResolver,
  hasAnyPermission(['website.delete', 'news.delete']),
  newsEventController.delete
);

module.exports = router;
