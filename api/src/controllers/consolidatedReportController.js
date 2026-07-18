const mongoose = require('mongoose');
const { Project, Scheme, Application, Payment, RecurringPayment, Beneficiary, Donation } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { buildFranchiseMatchStage } = require('../utils/franchiseFilterHelper');

/**
 * Consolidated Reports Controller
 *
 * Organisation-wide reporting & consolidation for Super Admin / State Admin:
 *  - overview   : single-shot KPIs (applications, funds, beneficiaries, donations, budgets)
 *  - schemes    : per-scheme consolidation (applications, approved vs disbursed, utilisation)
 *  - regions    : district/area/unit roll-up of applications and money
 *  - funds-flow : monthly time-series of requested/approved/disbursed/donations
 *  - pipeline   : approval funnel, pending-ageing buckets, processing-time metrics
 *
 * All queries are franchise-scoped via buildFranchiseMatchStage (super admins with
 * cross-franchise access can pass ?franchiseFilter=<id|all> like everywhere else).
 */

// Statuses that represent money committed to a beneficiary
const COMMITTED_STATUSES = ['approved', 'disbursed', 'completed'];
// Application statuses that are still in the review pipeline
const IN_PROGRESS_STATUSES = ['pending', 'under_review', 'field_verification', 'interview_scheduled', 'interview_completed', 'pending_committee_approval', 'on_hold'];

function buildDateMatch(startDate, endDate, field = 'createdAt') {
  const range = {};
  if (startDate) {
    const d = new Date(startDate);
    if (!isNaN(d)) range.$gte = d;
  }
  if (endDate) {
    const d = new Date(endDate);
    if (!isNaN(d)) {
      d.setHours(23, 59, 59, 999);
      range.$lte = d;
    }
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

// Sum completed / pending payment amounts grouped by an arbitrary key
async function paymentSumsBy(groupField, franchiseMatch, dateMatch) {
  const pipelineFor = (Model, completedStatuses, pendingStatuses) => Model.aggregate([
    { $match: { ...franchiseMatch, ...dateMatch } },
    {
      $group: {
        _id: `$${groupField}`,
        disbursed: {
          $sum: { $cond: [{ $in: ['$status', completedStatuses] }, '$amount', 0] }
        },
        pendingAmount: {
          $sum: { $cond: [{ $in: ['$status', pendingStatuses] }, '$amount', 0] }
        },
        disbursedCount: {
          $sum: { $cond: [{ $in: ['$status', completedStatuses] }, 1, 0] }
        }
      }
    }
  ]);

  const [regular, recurring] = await Promise.all([
    pipelineFor(Payment, ['completed'], ['pending', 'approved', 'processing']),
    pipelineFor(RecurringPayment, ['completed'], ['scheduled', 'due', 'overdue', 'processing'])
  ]);

  const map = new Map();
  for (const row of [...regular, ...recurring]) {
    const key = row._id ? row._id.toString() : 'unknown';
    const existing = map.get(key) || { disbursed: 0, pendingAmount: 0, disbursedCount: 0 };
    existing.disbursed += row.disbursed || 0;
    existing.pendingAmount += row.pendingAmount || 0;
    existing.disbursedCount += row.disbursedCount || 0;
    map.set(key, existing);
  }
  return map;
}

class ConsolidatedReportController {
  /**
   * GET /api/consolidated-reports/overview?startDate=&endDate=
   */
  async getOverview(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const franchiseMatch = buildFranchiseMatchStage(req);
      const appDateMatch = buildDateMatch(startDate, endDate, 'createdAt');

      const [appStats, statusBreakdown, disbursement, recurringDisbursement,
             budgetStats, schemeBudgetStats, beneficiaryStats, donationStats,
             schemeCounts, projectCounts] = await Promise.all([
        // Application totals + money + processing time
        Application.aggregate([
          { $match: { ...franchiseMatch, ...appDateMatch, status: { $ne: 'draft' } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalRequested: { $sum: '$requestedAmount' },
              totalApproved: {
                $sum: { $cond: [{ $in: ['$status', COMMITTED_STATUSES] }, '$approvedAmount', 0] }
              },
              approvedCount: {
                $sum: { $cond: [{ $in: ['$status', COMMITTED_STATUSES] }, 1, 0] }
              },
              rejectedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
              },
              inProgressCount: {
                $sum: { $cond: [{ $in: ['$status', IN_PROGRESS_STATUSES] }, 1, 0] }
              },
              autoRejectedCount: {
                $sum: { $cond: [{ $eq: ['$eligibilityScore.autoRejected', true] }, 1, 0] }
              },
              uniqueBeneficiaries: { $addToSet: '$beneficiary' },
              avgApprovalDays: {
                $avg: {
                  $cond: [
                    { $and: [{ $ne: ['$approvedAt', null] }, { $ne: ['$createdAt', null] }] },
                    { $divide: [{ $subtract: ['$approvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] },
                    null
                  ]
                }
              }
            }
          },
          {
            $project: {
              total: 1, totalRequested: 1, totalApproved: 1,
              approvedCount: 1, rejectedCount: 1, inProgressCount: 1, autoRejectedCount: 1,
              avgApprovalDays: 1,
              uniqueBeneficiaries: { $size: '$uniqueBeneficiaries' }
            }
          }
        ]),
        Application.aggregate([
          { $match: { ...franchiseMatch, ...appDateMatch, status: { $ne: 'draft' } } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Payment.aggregate([
          { $match: { ...franchiseMatch, ...buildDateMatch(startDate, endDate, 'createdAt') } },
          {
            $group: {
              _id: null,
              disbursed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
              disbursedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              pendingAmount: { $sum: { $cond: [{ $in: ['$status', ['pending', 'approved', 'processing']] }, '$amount', 0] } },
              pendingCount: { $sum: { $cond: [{ $in: ['$status', ['pending', 'approved', 'processing']] }, 1, 0] } },
              failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
            }
          }
        ]),
        RecurringPayment.aggregate([
          { $match: { ...franchiseMatch, ...buildDateMatch(startDate, endDate, 'createdAt') } },
          {
            $group: {
              _id: null,
              disbursed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
              disbursedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              pendingAmount: { $sum: { $cond: [{ $in: ['$status', ['scheduled', 'due', 'overdue', 'processing']] }, '$amount', 0] } },
              pendingCount: { $sum: { $cond: [{ $in: ['$status', ['scheduled', 'due', 'overdue', 'processing']] }, 1, 0] } },
              overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0] } },
              overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
            }
          }
        ]),
        Project.aggregate([
          { $match: { ...franchiseMatch, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, totalBudget: { $sum: '$budget.total' }, count: { $sum: 1 } } }
        ]),
        Scheme.aggregate([
          { $match: { ...franchiseMatch, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, totalBudget: { $sum: '$budget.total' }, count: { $sum: 1 } } }
        ]),
        Beneficiary.aggregate([
          { $match: { ...franchiseMatch, isDeleted: { $ne: true } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
              active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
            }
          }
        ]),
        Donation.aggregate([
          { $match: { ...franchiseMatch, ...buildDateMatch(startDate, endDate, 'createdAt'), status: 'completed' } },
          { $group: { _id: null, totalReceived: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Scheme.aggregate([
          { $match: franchiseMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Project.aggregate([
          { $match: franchiseMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      const apps = appStats[0] || {
        total: 0, totalRequested: 0, totalApproved: 0, approvedCount: 0,
        rejectedCount: 0, inProgressCount: 0, autoRejectedCount: 0,
        avgApprovalDays: null, uniqueBeneficiaries: 0
      };
      const pay = disbursement[0] || { disbursed: 0, disbursedCount: 0, pendingAmount: 0, pendingCount: 0, failedCount: 0 };
      const rec = recurringDisbursement[0] || { disbursed: 0, disbursedCount: 0, pendingAmount: 0, pendingCount: 0, overdueAmount: 0, overdueCount: 0 };
      const projBudget = budgetStats[0] || { totalBudget: 0, count: 0 };
      const schemeBudget = schemeBudgetStats[0] || { totalBudget: 0, count: 0 };
      const bens = beneficiaryStats[0] || { total: 0, verified: 0, active: 0 };
      const dons = donationStats[0] || { totalReceived: 0, count: 0 };

      const totalBudget = projBudget.totalBudget + schemeBudget.totalBudget;
      const totalDisbursed = pay.disbursed + rec.disbursed;
      const totalPendingDisbursement = pay.pendingAmount + rec.pendingAmount;
      const decidedCount = apps.approvedCount + apps.rejectedCount;

      const statusMap = {};
      statusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

      return ResponseHelper.success(res, {
        overview: {
          period: { startDate: startDate || null, endDate: endDate || null },
          applications: {
            total: apps.total,
            byStatus: statusMap,
            approved: apps.approvedCount,
            rejected: apps.rejectedCount,
            inProgress: apps.inProgressCount,
            autoRejected: apps.autoRejectedCount,
            approvalRate: decidedCount > 0 ? Math.round((apps.approvedCount / decidedCount) * 1000) / 10 : 0,
            avgApprovalDays: apps.avgApprovalDays != null ? Math.round(apps.avgApprovalDays * 10) / 10 : null,
            uniqueBeneficiaries: apps.uniqueBeneficiaries
          },
          funds: {
            totalBudget,
            projectBudget: projBudget.totalBudget,
            schemeBudget: schemeBudget.totalBudget,
            totalRequested: apps.totalRequested,
            totalApproved: apps.totalApproved,
            totalDisbursed,
            totalPendingDisbursement,
            overdueAmount: rec.overdueAmount,
            overdueCount: rec.overdueCount,
            failedPayments: pay.failedCount,
            budgetUtilization: totalBudget > 0 ? Math.round((totalDisbursed / totalBudget) * 1000) / 10 : 0,
            disbursementEfficiency: apps.totalApproved > 0 ? Math.round((totalDisbursed / apps.totalApproved) * 1000) / 10 : 0,
            completedPaymentCount: pay.disbursedCount + rec.disbursedCount,
            pendingPaymentCount: pay.pendingCount + rec.pendingCount
          },
          beneficiaries: {
            total: bens.total,
            verified: bens.verified,
            active: bens.active
          },
          donations: {
            totalReceived: dons.totalReceived,
            count: dons.count
          },
          entities: {
            projects: projCountsToMap(projectCounts),
            schemes: projCountsToMap(schemeCounts),
            totalProjects: projBudget.count,
            totalSchemes: schemeBudget.count
          }
        }
      });
    } catch (error) {
      console.error('❌ Consolidated Overview Error:', error);
      return ResponseHelper.error(res, 'Failed to fetch consolidated overview', 500);
    }
  }

  /**
   * GET /api/consolidated-reports/schemes?startDate=&endDate=
   * Per-scheme consolidation of applications and money movement.
   */
  async getSchemeConsolidation(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const franchiseMatch = buildFranchiseMatchStage(req);
      const appDateMatch = buildDateMatch(startDate, endDate, 'createdAt');

      const [appRows, paymentMap, schemes] = await Promise.all([
        Application.aggregate([
          { $match: { ...franchiseMatch, ...appDateMatch, status: { $ne: 'draft' } } },
          {
            $group: {
              _id: '$scheme',
              total: { $sum: 1 },
              approved: { $sum: { $cond: [{ $in: ['$status', COMMITTED_STATUSES] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $in: ['$status', IN_PROGRESS_STATUSES] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              requestedAmount: { $sum: '$requestedAmount' },
              approvedAmount: { $sum: { $cond: [{ $in: ['$status', COMMITTED_STATUSES] }, '$approvedAmount', 0] } },
              beneficiaries: { $addToSet: '$beneficiary' }
            }
          }
        ]),
        paymentSumsBy('scheme', franchiseMatch, buildDateMatch(startDate, endDate, 'createdAt')),
        Scheme.find(franchiseMatch)
          .select('name code category status budget project')
          .populate('project', 'name code')
          .lean()
      ]);

      const appMap = new Map(appRows.map(r => [r._id ? r._id.toString() : 'unknown', r]));

      // Applications whose scheme was deleted (or is outside the franchise scope)
      // must still appear in the consolidation — surface them as an explicit row.
      const knownSchemeIds = new Set(schemes.map(s => s._id.toString()));
      const orphanedRows = [...appMap.keys()]
        .filter(id => !knownSchemeIds.has(id))
        .map(id => ({
          _id: id === 'unknown' ? null : id,
          name: 'Unknown / Deleted Scheme',
          code: '—',
          category: 'other',
          status: 'deleted',
          budget: { total: 0 },
          project: null
        }));

      const rows = [...schemes, ...orphanedRows].map(scheme => {
        const id = scheme._id ? scheme._id.toString() : 'unknown';
        const a = appMap.get(id) || {
          total: 0, approved: 0, rejected: 0, inProgress: 0, completed: 0,
          requestedAmount: 0, approvedAmount: 0, beneficiaries: []
        };
        const p = paymentMap.get(id) || { disbursed: 0, pendingAmount: 0, disbursedCount: 0 };
        const budgetTotal = scheme.budget?.total || 0;
        const decided = a.approved + a.rejected;

        return {
          schemeId: scheme._id,
          name: scheme.name,
          code: scheme.code,
          category: scheme.category,
          status: scheme.status,
          project: scheme.project ? { id: scheme.project._id, name: scheme.project.name } : null,
          budgetTotal,
          applications: {
            total: a.total,
            approved: a.approved,
            rejected: a.rejected,
            inProgress: a.inProgress,
            completed: a.completed
          },
          beneficiaries: Array.isArray(a.beneficiaries) ? a.beneficiaries.length : 0,
          requestedAmount: a.requestedAmount,
          approvedAmount: a.approvedAmount,
          disbursedAmount: p.disbursed,
          pendingDisbursement: p.pendingAmount,
          approvalRate: decided > 0 ? Math.round((a.approved / decided) * 1000) / 10 : 0,
          budgetUtilization: budgetTotal > 0 ? Math.round((p.disbursed / budgetTotal) * 1000) / 10 : 0,
          disbursementEfficiency: a.approvedAmount > 0 ? Math.round((p.disbursed / a.approvedAmount) * 1000) / 10 : 0
        };
      }).sort((x, y) => y.applications.total - x.applications.total);

      return ResponseHelper.success(res, { schemes: rows });
    } catch (error) {
      console.error('❌ Scheme Consolidation Error:', error);
      return ResponseHelper.error(res, 'Failed to fetch scheme consolidation', 500);
    }
  }

  /**
   * GET /api/consolidated-reports/regions?level=district|area|unit&startDate=&endDate=
   * Regional roll-up of applications and money.
   */
  async getRegionConsolidation(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const level = ['district', 'area', 'unit'].includes(req.query.level) ? req.query.level : 'district';
      const franchiseMatch = buildFranchiseMatchStage(req);
      const appDateMatch = buildDateMatch(startDate, endDate, 'createdAt');

      const rows = await Application.aggregate([
        { $match: { ...franchiseMatch, ...appDateMatch, status: { $ne: 'draft' } } },
        {
          $group: {
            _id: `$${level}`,
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $in: ['$status', COMMITTED_STATUSES] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $in: ['$status', IN_PROGRESS_STATUSES] }, 1, 0] } },
            requestedAmount: { $sum: '$requestedAmount' },
            approvedAmount: { $sum: { $cond: [{ $in: ['$status', COMMITTED_STATUSES] }, '$approvedAmount', 0] } },
            beneficiaries: { $addToSet: '$beneficiary' },
            applicationIds: { $push: '$_id' }
          }
        },
        {
          $lookup: {
            from: 'locations',
            localField: '_id',
            foreignField: '_id',
            as: 'location'
          }
        },
        {
          $lookup: {
            from: 'payments',
            let: { appIds: '$applicationIds' },
            pipeline: [
              { $match: { $expr: { $in: ['$application', '$$appIds'] } } },
              {
                $group: {
                  _id: null,
                  disbursed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                  pendingAmount: { $sum: { $cond: [{ $in: ['$status', ['pending', 'approved', 'processing']] }, '$amount', 0] } }
                }
              }
            ],
            as: 'paymentTotals'
          }
        },
        {
          $lookup: {
            from: 'recurringpayments',
            let: { appIds: '$applicationIds' },
            pipeline: [
              { $match: { $expr: { $in: ['$application', '$$appIds'] } } },
              {
                $group: {
                  _id: null,
                  disbursed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                  pendingAmount: { $sum: { $cond: [{ $in: ['$status', ['scheduled', 'due', 'overdue', 'processing']] }, '$amount', 0] } }
                }
              }
            ],
            as: 'recurringTotals'
          }
        },
        {
          $project: {
            regionId: '$_id',
            regionName: { $ifNull: [{ $arrayElemAt: ['$location.name', 0] }, 'Unassigned'] },
            total: 1,
            approved: 1,
            rejected: 1,
            inProgress: 1,
            requestedAmount: 1,
            approvedAmount: 1,
            beneficiaries: { $size: '$beneficiaries' },
            disbursedAmount: {
              $add: [
                { $ifNull: [{ $arrayElemAt: ['$paymentTotals.disbursed', 0] }, 0] },
                { $ifNull: [{ $arrayElemAt: ['$recurringTotals.disbursed', 0] }, 0] }
              ]
            },
            pendingDisbursement: {
              $add: [
                { $ifNull: [{ $arrayElemAt: ['$paymentTotals.pendingAmount', 0] }, 0] },
                { $ifNull: [{ $arrayElemAt: ['$recurringTotals.pendingAmount', 0] }, 0] }
              ]
            }
          }
        },
        { $sort: { total: -1 } }
      ]);

      const regions = rows.map(r => {
        const decided = r.approved + r.rejected;
        return {
          regionId: r.regionId,
          regionName: r.regionName,
          level,
          applications: { total: r.total, approved: r.approved, rejected: r.rejected, inProgress: r.inProgress },
          beneficiaries: r.beneficiaries,
          requestedAmount: r.requestedAmount,
          approvedAmount: r.approvedAmount,
          disbursedAmount: r.disbursedAmount,
          pendingDisbursement: r.pendingDisbursement,
          approvalRate: decided > 0 ? Math.round((r.approved / decided) * 1000) / 10 : 0,
          disbursementEfficiency: r.approvedAmount > 0 ? Math.round((r.disbursedAmount / r.approvedAmount) * 1000) / 10 : 0
        };
      });

      return ResponseHelper.success(res, { level, regions });
    } catch (error) {
      console.error('❌ Region Consolidation Error:', error);
      return ResponseHelper.error(res, 'Failed to fetch region consolidation', 500);
    }
  }

  /**
   * GET /api/consolidated-reports/funds-flow?months=12
   * Monthly time-series: requested vs approved vs disbursed vs donations.
   */
  async getFundsFlow(req, res) {
    try {
      const months = Math.min(Math.max(parseInt(req.query.months) || 12, 1), 36);
      const franchiseMatch = buildFranchiseMatchStage(req);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (months - 1));
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const monthKey = field => ({
        year: { $year: `$${field}` },
        month: { $month: `$${field}` }
      });

      const [requested, approved, disbursedPayments, disbursedRecurring, donations] = await Promise.all([
        Application.aggregate([
          { $match: { ...franchiseMatch, createdAt: { $gte: startDate }, status: { $ne: 'draft' } } },
          { $group: { _id: monthKey('createdAt'), amount: { $sum: '$requestedAmount' }, count: { $sum: 1 } } }
        ]),
        Application.aggregate([
          { $match: { ...franchiseMatch, approvedAt: { $gte: startDate }, status: { $in: COMMITTED_STATUSES } } },
          { $group: { _id: monthKey('approvedAt'), amount: { $sum: '$approvedAmount' }, count: { $sum: 1 } } }
        ]),
        Payment.aggregate([
          { $match: { ...franchiseMatch, status: 'completed', 'timeline.completedAt': { $gte: startDate } } },
          { $group: { _id: monthKey('timeline.completedAt'), amount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        RecurringPayment.aggregate([
          { $match: { ...franchiseMatch, status: 'completed', updatedAt: { $gte: startDate } } },
          { $group: { _id: monthKey('updatedAt'), amount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Donation.aggregate([
          { $match: { ...franchiseMatch, status: 'completed', createdAt: { $gte: startDate } } },
          { $group: { _id: monthKey('createdAt'), amount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ])
      ]);

      // Build a complete month range and merge series in
      const series = [];
      const index = new Map();
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const row = {
          month: key,
          monthLabel: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
          requested: 0, requestedCount: 0,
          approved: 0, approvedCount: 0,
          disbursed: 0, disbursedCount: 0,
          donations: 0, donationCount: 0
        };
        series.push(row);
        index.set(key, row);
      }

      const merge = (rows, amountField, countField) => {
        rows.forEach(r => {
          const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
          const row = index.get(key);
          if (row) {
            row[amountField] += r.amount || 0;
            row[countField] += r.count || 0;
          }
        });
      };

      merge(requested, 'requested', 'requestedCount');
      merge(approved, 'approved', 'approvedCount');
      merge(disbursedPayments, 'disbursed', 'disbursedCount');
      merge(disbursedRecurring, 'disbursed', 'disbursedCount');
      merge(donations, 'donations', 'donationCount');

      return ResponseHelper.success(res, { months, fundsFlow: series });
    } catch (error) {
      console.error('❌ Funds Flow Error:', error);
      return ResponseHelper.error(res, 'Failed to fetch funds flow', 500);
    }
  }

  /**
   * GET /api/consolidated-reports/pipeline
   * Approval funnel, current-stage distribution, pending ageing, processing times.
   */
  async getPipeline(req, res) {
    try {
      const franchiseMatch = buildFranchiseMatchStage(req);
      const now = new Date();
      const daysAgo = n => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

      const [statusFunnel, stageDistribution, agingBuckets, processing, interviews] = await Promise.all([
        Application.aggregate([
          { $match: { ...franchiseMatch, status: { $ne: 'draft' } } },
          { $group: { _id: '$status', count: { $sum: 1 }, requestedAmount: { $sum: '$requestedAmount' } } },
          { $sort: { count: -1 } }
        ]),
        Application.aggregate([
          { $match: { ...franchiseMatch, status: { $in: IN_PROGRESS_STATUSES } } },
          { $group: { _id: '$currentStage', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Application.aggregate([
          { $match: { ...franchiseMatch, status: { $in: IN_PROGRESS_STATUSES } } },
          {
            $bucket: {
              groupBy: '$createdAt',
              boundaries: [new Date(0), daysAgo(90), daysAgo(30), daysAgo(7), now],
              default: 'other',
              output: { count: { $sum: 1 }, requestedAmount: { $sum: '$requestedAmount' } }
            }
          }
        ]),
        Application.aggregate([
          { $match: { ...franchiseMatch, approvedAt: { $ne: null } } },
          {
            $project: {
              approvalDays: { $divide: [{ $subtract: ['$approvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] }
            }
          },
          {
            $group: {
              _id: null,
              avgDays: { $avg: '$approvalDays' },
              minDays: { $min: '$approvalDays' },
              maxDays: { $max: '$approvalDays' },
              count: { $sum: 1 }
            }
          }
        ]),
        Application.aggregate([
          { $match: { ...franchiseMatch, 'interview.scheduledDate': { $ne: null } } },
          { $group: { _id: '$interview.result', count: { $sum: 1 } } }
        ])
      ]);

      // Map $bucket output (boundary keys) to friendly ageing labels.
      // Boundaries: [epoch, now-90d, now-30d, now-7d, now] →
      //   bucket keyed by epoch      = older than 90 days
      //   bucket keyed by now-90d    = 31-90 days
      //   bucket keyed by now-30d    = 8-30 days
      //   bucket keyed by now-7d     = 0-7 days
      const boundaryLabels = ['over90days', '31to90days', '8to30days', '0to7days'];
      const boundaries = [new Date(0), daysAgo(90), daysAgo(30), daysAgo(7)];
      const aging = { '0to7days': { count: 0, requestedAmount: 0 }, '8to30days': { count: 0, requestedAmount: 0 }, '31to90days': { count: 0, requestedAmount: 0 }, over90days: { count: 0, requestedAmount: 0 } };
      agingBuckets.forEach(bucket => {
        const idx = boundaries.findIndex(b => bucket._id instanceof Date && Math.abs(b.getTime() - bucket._id.getTime()) < 1000);
        const label = idx >= 0 ? boundaryLabels[idx] : null;
        if (label) aging[label] = { count: bucket.count, requestedAmount: bucket.requestedAmount };
      });

      const interviewMap = {};
      interviews.forEach(i => { interviewMap[i._id || 'pending'] = i.count; });

      const proc = processing[0] || { avgDays: null, minDays: null, maxDays: null, count: 0 };

      return ResponseHelper.success(res, {
        pipeline: {
          statusFunnel: statusFunnel.map(s => ({ status: s._id, count: s.count, requestedAmount: s.requestedAmount })),
          stageDistribution: stageDistribution.map(s => ({ stage: s._id || 'Unknown', count: s.count })),
          pendingAging: aging,
          processingTime: {
            avgDays: proc.avgDays != null ? Math.round(proc.avgDays * 10) / 10 : null,
            minDays: proc.minDays != null ? Math.round(proc.minDays * 10) / 10 : null,
            maxDays: proc.maxDays != null ? Math.round(proc.maxDays * 10) / 10 : null,
            approvedCount: proc.count
          },
          interviews: {
            scheduled: (interviewMap.pending || 0) + (interviewMap.passed || 0) + (interviewMap.failed || 0),
            pending: interviewMap.pending || 0,
            passed: interviewMap.passed || 0,
            failed: interviewMap.failed || 0
          }
        }
      });
    } catch (error) {
      console.error('❌ Pipeline Report Error:', error);
      return ResponseHelper.error(res, 'Failed to fetch pipeline report', 500);
    }
  }
}

function projCountsToMap(rows) {
  const map = {};
  rows.forEach(r => { map[r._id] = r.count; });
  return map;
}

module.exports = new ConsolidatedReportController();
