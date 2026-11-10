const express = require('express');
const easebuzzController = require('../controllers/easebuzzController');

// Public site endpoints — franchise comes from the tenant resolver
const router = express.Router();
router.get('/config', easebuzzController.getConfig);
router.post('/initiate', easebuzzController.initiate);
router.get('/status/:txnid', easebuzzController.getStatus);

// Easebuzz → API (surl/furl and webhook). Mounted in app.js before CORS and the
// tenant resolver, so it parses its own bodies: form-urlencoded per the docs,
// JSON accepted as well.
const callbackRouter = express.Router();
callbackRouter.use(express.urlencoded({ extended: false }), express.json());
callbackRouter.post('/response', easebuzzController.handleResponse);
callbackRouter.post('/webhook', easebuzzController.webhook);

module.exports = { router, callbackRouter };
