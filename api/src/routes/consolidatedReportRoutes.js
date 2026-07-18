const express = require('express');
const consolidatedReportController = require('../controllers/consolidatedReportController');
const { authenticate, authorize, crossFranchiseResolver } = require('../middleware/auth');

const router = express.Router();

// Consolidated organisation-wide reports — restricted to top-level admins.
// Global super admins (user.isSuperAdmin) bypass the role check inside authorize().
router.use(authenticate);
router.use(crossFranchiseResolver);
router.use(authorize('super_admin', 'state_admin'));

/**
 * @swagger
 * /api/consolidated-reports/overview:
 *   get:
 *     summary: Organisation-wide KPIs (applications, funds, beneficiaries, donations)
 *     tags: [Consolidated Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/overview', consolidatedReportController.getOverview);

/**
 * @swagger
 * /api/consolidated-reports/schemes:
 *   get:
 *     summary: Per-scheme consolidation of applications and money movement
 *     tags: [Consolidated Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/schemes', consolidatedReportController.getSchemeConsolidation);

/**
 * @swagger
 * /api/consolidated-reports/regions:
 *   get:
 *     summary: Regional (district/area/unit) roll-up of applications and money
 *     tags: [Consolidated Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/regions', consolidatedReportController.getRegionConsolidation);

/**
 * @swagger
 * /api/consolidated-reports/funds-flow:
 *   get:
 *     summary: Monthly time-series of requested/approved/disbursed/donations
 *     tags: [Consolidated Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/funds-flow', consolidatedReportController.getFundsFlow);

/**
 * @swagger
 * /api/consolidated-reports/pipeline:
 *   get:
 *     summary: Approval funnel, pending ageing and processing-time metrics
 *     tags: [Consolidated Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/pipeline', consolidatedReportController.getPipeline);

module.exports = router;
