const Beneficiary = require('../models/Beneficiary');
const { buildFranchiseReadFilter } = require('./franchiseFilterHelper');
const { buildFormDataFilter, buildFormRulesFilter } = require('./formDataFilter');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mongo filter for the admin application listing built from its query params.
 * Shared by GET /applications and GET /applications/export so an export
 * returns exactly the rows the list shows. Regional/coordinator scope and the
 * franchise restriction are applied by the callers.
 */
async function buildApplicationQueryFilter(query, req) {
  const {
    search = '',
    status = '',
    scheme = '',
    project = '',
    state = '',
    district = '',
    area = '',
    unit = '',
    startDate = '',
    endDate = '',
    formFilters = '',
    formRules = ''
  } = query;

  const filter = {};

  if (search) {
    // Search in application number or beneficiary details
    const beneficiaries = await Beneficiary.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    filter.$or = [
      { applicationNumber: { $regex: search, $options: 'i' } },
      { beneficiary: { $in: beneficiaries.map(b => b._id) } }
    ];
  }

  // Beneficiary drafts (unsubmitted applications) must never be visible to
  // authorities. Only the beneficiary can see/manage their own drafts.
  if (status && status !== 'all' && status !== 'draft') {
    filter.status = status;
  } else {
    filter.status = { $ne: 'draft' };
  }
  if (scheme) filter.scheme = scheme;
  if (project) filter.project = project;
  if (state) filter.state = state;
  if (district) filter.district = district;
  if (area) filter.area = area;
  if (unit) filter.unit = unit;

  // Scheme-specific form filters. Only meaningful when a scheme is selected,
  // since field keys are per form.
  if (scheme && formFilters) {
    Object.assign(filter, await buildFormDataFilter(scheme, formFilters, buildFranchiseReadFilter(req)));
  }
  if (scheme && formRules) {
    const rulesFilter = await buildFormRulesFilter(scheme, formRules, buildFranchiseReadFilter(req));
    if (rulesFilter) filter.$and = [...(filter.$and || []), rulesFilter];
  }

  // Date range filter (must match the same submittedAt window used by the
  // consolidation stats endpoint, otherwise drill-down counts diverge from
  // the stat cards). Date-only bounds cover the whole end day; full
  // timestamps (sent by the list filters) are used as-is.
  if (startDate || endDate) {
    filter.submittedAt = {};
    if (startDate) filter.submittedAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      if (DATE_ONLY.test(endDate)) end.setHours(23, 59, 59, 999);
      filter.submittedAt.$lte = end;
    }
  }

  return filter;
}

module.exports = { buildApplicationQueryFilter };
