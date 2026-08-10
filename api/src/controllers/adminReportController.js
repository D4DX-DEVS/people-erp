const { AdminReport, AdminReportFormConfig, AdminReportSubmission, User, Location, UserFranchise } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const {
  buildFranchiseReadFilter,
  getWriteFranchiseId
} = require('../utils/franchiseFilterHelper');

// ── Helpers ───────────────────────────────────────────────────────────────────

const isSuperAdmin = (req) =>
  req.user?.isSuperAdmin || req.userRole === 'super_admin' || req.user?.role === 'super_admin';

const effectiveRole = (req) =>
  req.userRole || req.user?.role;

// Which adminScope field holds the location an admin role reports from
const ROLE_SCOPE_FIELD = {
  unit_admin: 'unit',
  area_admin: 'area',
  area_president: 'area',
  district_admin: 'district'
};

const scopeLocationForRole = (role, scope) => {
  if (!scope) return null;
  const field = ROLE_SCOPE_FIELD[role];
  return (field && scope[field]) || null;
};

// The submitter's own location: franchise membership scope first, legacy User.adminScope second
const resolveSubmitterLocation = (req) => {
  const role = effectiveRole(req);
  return (
    scopeLocationForRole(role, req.userFranchise?.adminScope) ||
    scopeLocationForRole(role, req.user?.adminScope)
  );
};

// Expand a location id to itself plus all descendants (district → areas → units)
const expandLocationIds = async (locationId) => {
  const allIds = [locationId];
  let frontier = [locationId];
  for (let depth = 0; depth < 3 && frontier.length > 0; depth++) {
    const children = await Location.find({ parent: { $in: frontier } }).select('_id').lean();
    frontier = children.map((c) => c._id);
    allIds.push(...frontier);
  }
  return allIds;
};

// Backfill location on legacy submissions saved before it was captured server-side.
// One attempt per row (locationBackfillAt marks it) so this converges to a no-op.
const backfillSubmissionLocations = async (reportId) => {
  const missing = await AdminReportSubmission.find({
    adminReport: reportId,
    $or: [{ location: null }, { location: { $exists: false } }],
    locationBackfillAt: { $exists: false }
  }).select('submittedBy submitterRole franchise').lean();
  if (missing.length === 0) return;

  const userIds = [...new Set(missing.map((m) => String(m.submittedBy)))];
  const [memberships, users] = await Promise.all([
    UserFranchise.find({ user: { $in: userIds }, isActive: true })
      .select('user franchise role adminScope').lean(),
    User.find({ _id: { $in: userIds } }).select('adminScope role').lean()
  ]);
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const now = new Date();
  const ops = [];
  for (const sub of missing) {
    const uid = String(sub.submittedBy);
    const legacyUser = userById.get(uid);
    const role = sub.submitterRole || legacyUser?.role;
    // Only trust a membership in the submission's own franchise — a same-role
    // membership in another franchise would carry the wrong location.
    const membership = memberships.find((m) =>
      String(m.user) === uid &&
      (!sub.submitterRole || m.role === sub.submitterRole) &&
      sub.franchise && String(m.franchise) === String(sub.franchise)
    );
    const location =
      scopeLocationForRole(role, membership?.adminScope) ||
      scopeLocationForRole(role, legacyUser?.adminScope);
    const update = location
      ? { $set: { location, locationBackfillAt: now } }
      : { $set: { locationBackfillAt: now } };
    ops.push({ updateOne: { filter: { _id: sub._id }, update } });
  }
  if (ops.length > 0) await AdminReportSubmission.bulkWrite(ops);
};

// UserFranchise memberships targeted by a report, enriched with user + scope location
const getTargetedMemberships = async (report) => {
  const query = { role: report.targetUserType, isActive: true };
  if (report.franchise) query.franchise = report.franchise;
  const scopeField = ROLE_SCOPE_FIELD[report.targetUserType];

  let membershipQuery = UserFranchise.find(query)
    .select('user role adminScope')
    .populate('user', 'name email phone');
  if (scopeField) {
    membershipQuery = membershipQuery.populate(`adminScope.${scopeField}`, 'name type');
  }
  const memberships = await membershipQuery.lean();

  const seen = new Set();
  const result = [];
  for (const m of memberships) {
    if (!m.user) continue;
    const uid = String(m.user._id);
    if (seen.has(uid)) continue;
    seen.add(uid);
    result.push({
      userId: uid,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      role: m.role,
      location: scopeField ? (m.adminScope?.[scopeField] || null) : null
    });
  }
  return result;
};

const filterMemberships = async (memberships, { district, area, search }) => {
  let result = memberships;
  const selected = area || district;
  if (selected) {
    const ids = new Set((await expandLocationIds(selected)).map(String));
    result = result.filter((m) => m.location && ids.has(String(m.location._id)));
  }
  if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    result = result.filter((m) => regex.test(m.name || '') || regex.test(m.location?.name || ''));
  }
  return result;
};

// ── Report CRUD ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin-reports
 * Super admin: all reports with full filters.
 * Other admins: only active reports that target their role.
 */
exports.getAdminReports = async (req, res) => {
  try {
    const {
      targetUserType, status, search,
      district, area, unit,
      sortBy = 'createdAt', sortOrder = 'desc',
      page = 1, limit = 20
    } = req.query;

    const filter = { ...buildFranchiseReadFilter(req) };
    const userRole = effectiveRole(req);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (isSuperAdmin(req)) {
      // Super admin can filter freely
      if (targetUserType) filter.targetUserType = targetUserType;
      if (status) filter.status = status;
    } else {
      // Non-super-admin: only see active reports targeted at their role
      // AND whose form has been published (so they can actually fill it)
      filter.targetUserType = userRole;
      filter.status = 'active';
      filter.isFormPublished = true;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Location filters (only meaningful for super admin)
    if (isSuperAdmin(req)) {
      const locationIds = [district, area, unit].filter(Boolean);
      if (locationIds.length > 0) {
        filter.$or = [
          ...(filter.$or || []),
          { targetLocations: { $in: locationIds } },
          { targetLocations: { $size: 0 } }, // also include untargeted (all locations)
          { targetLocations: { $exists: false } }
        ];
      }
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'status', 'targetUserType'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [reports, total] = await Promise.all([
      AdminReport.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('targetLocations', 'name type code')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdminReport.countDocuments(filter)
    ]);

    return ResponseHelper.success(res, {
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getAdminReports error:', error);
    return ResponseHelper.error(res, 'Failed to fetch reports', 500);
  }
};

/**
 * GET /api/admin-reports/:id
 */
exports.getAdminReportById = async (req, res) => {
  try {
    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    })
      .populate('createdBy', 'name email')
      .populate('targetLocations', 'name type code')
      .lean();

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    // Non-super-admins can only see active reports for their role
    if (!isSuperAdmin(req)) {
      const userRole = effectiveRole(req);
      if (report.status !== 'active' || report.targetUserType !== userRole) {
        return ResponseHelper.error(res, 'Report not found', 404);
      }
    }

    return ResponseHelper.success(res, { report });
  } catch (error) {
    console.error('getAdminReportById error:', error);
    return ResponseHelper.error(res, 'Failed to fetch report', 500);
  }
};

/**
 * POST /api/admin-reports  (super_admin only)
 */
exports.createAdminReport = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return ResponseHelper.error(res, 'Access denied', 403);
    }

    const { title, description, targetUserType, targetLocations, status } = req.body;

    if (!title || !targetUserType) {
      return ResponseHelper.error(res, 'Title and target user type are required', 400);
    }

    const franchiseId = getWriteFranchiseId(req);

    const report = await AdminReport.create({
      title: title.trim(),
      description: description?.trim(),
      targetUserType,
      targetLocations: targetLocations || [],
      status: status || 'draft',
      createdBy: req.user._id,
      franchise: franchiseId
    });

    return ResponseHelper.success(res, { report }, 'Report created successfully', 201);
  } catch (error) {
    console.error('createAdminReport error:', error);
    return ResponseHelper.error(res, 'Failed to create report', 500);
  }
};

/**
 * PUT /api/admin-reports/:id  (super_admin only)
 */
exports.updateAdminReport = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return ResponseHelper.error(res, 'Access denied', 403);
    }

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    });

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    const { title, description, targetUserType, targetLocations, status } = req.body;

    if (title !== undefined) report.title = title.trim();
    if (description !== undefined) report.description = description?.trim();
    if (targetUserType !== undefined) report.targetUserType = targetUserType;
    if (targetLocations !== undefined) report.targetLocations = targetLocations;
    if (status !== undefined) report.status = status;
    report.updatedBy = req.user._id;

    await report.save();

    return ResponseHelper.success(res, { report }, 'Report updated successfully');
  } catch (error) {
    console.error('updateAdminReport error:', error);
    return ResponseHelper.error(res, 'Failed to update report', 500);
  }
};

/**
 * DELETE /api/admin-reports/:id  (super_admin only)
 * Blocked if any submissions exist.
 */
exports.deleteAdminReport = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return ResponseHelper.error(res, 'Access denied', 403);
    }

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    });

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    const submissionCount = await AdminReportSubmission.countDocuments({
      adminReport: report._id,
      status: 'submitted'
    });

    if (submissionCount > 0) {
      return ResponseHelper.error(
        res,
        `Cannot delete report: ${submissionCount} submission(s) already exist.`,
        400
      );
    }

    // Delete draft submissions and form config too
    await Promise.all([
      AdminReportSubmission.deleteMany({ adminReport: report._id }),
      AdminReportFormConfig.deleteMany({ adminReport: report._id }),
      report.deleteOne()
    ]);

    return ResponseHelper.success(res, null, 'Report deleted successfully');
  } catch (error) {
    console.error('deleteAdminReport error:', error);
    return ResponseHelper.error(res, 'Failed to delete report', 500);
  }
};

// ── Form Configuration ────────────────────────────────────────────────────────

/**
 * GET /api/admin-reports/:id/form-config
 */
exports.getFormConfig = async (req, res) => {
  try {
    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    }).lean();

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    // Non-super-admins can only view form config for active reports targeting them
    if (!isSuperAdmin(req)) {
      const userRole = effectiveRole(req);
      if (report.status !== 'active' || report.targetUserType !== userRole) {
        return ResponseHelper.error(res, 'Access denied', 403);
      }
    }

    const formConfig = await AdminReportFormConfig.findOne({
      adminReport: req.params.id,
      ...buildFranchiseReadFilter(req)
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!formConfig) {
      return ResponseHelper.success(res, {
        formConfiguration: null,
        hasConfiguration: false
      });
    }

    return ResponseHelper.success(res, {
      formConfiguration: formConfig,
      hasConfiguration: true
    });
  } catch (error) {
    console.error('getFormConfig error:', error);
    return ResponseHelper.error(res, 'Failed to fetch form configuration', 500);
  }
};

/**
 * PUT /api/admin-reports/:id/form-config  (super_admin only)
 * Upserts the form configuration.
 */
exports.updateFormConfig = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return ResponseHelper.error(res, 'Access denied', 403);
    }

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    });

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    const { title, description, pages, enabled, emailNotifications,
            allowDrafts, theme, submissionSettings, scoringConfig } = req.body;

    if (!title) return ResponseHelper.error(res, 'Form title is required', 400);
    if (!pages || !Array.isArray(pages)) {
      return ResponseHelper.error(res, 'Pages array is required', 400);
    }

    const franchiseId = getWriteFranchiseId(req);

    let formConfig = await AdminReportFormConfig.findOne({
      adminReport: report._id,
      ...buildFranchiseReadFilter(req)
    });

    if (formConfig) {
      // Update existing
      formConfig.title = title.trim();
      if (description !== undefined) formConfig.description = description;
      formConfig.pages = pages;
      if (enabled !== undefined) formConfig.enabled = enabled;
      if (emailNotifications !== undefined) formConfig.emailNotifications = emailNotifications;
      if (allowDrafts !== undefined) formConfig.allowDrafts = allowDrafts;
      if (theme) formConfig.theme = { ...formConfig.theme.toObject?.() || formConfig.theme, ...theme };
      if (submissionSettings) formConfig.submissionSettings = submissionSettings;
      if (scoringConfig) formConfig.scoringConfig = scoringConfig;
      formConfig.version = (formConfig.version || 1) + 1;
      formConfig.lastModified = new Date();
      formConfig.updatedBy = req.user._id;
      await formConfig.save();
    } else {
      // Create new
      formConfig = await AdminReportFormConfig.create({
        adminReport: report._id,
        title: title.trim(),
        description,
        pages,
        enabled: enabled !== undefined ? enabled : true,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : false,
        allowDrafts: allowDrafts !== undefined ? allowDrafts : true,
        theme,
        submissionSettings,
        scoringConfig,
        isPublished: false,
        version: 1,
        lastModified: new Date(),
        createdBy: req.user._id,
        franchise: franchiseId
      });
    }

    return ResponseHelper.success(res, { formConfiguration: formConfig }, 'Form configuration saved');
  } catch (error) {
    console.error('updateFormConfig error:', error);
    return ResponseHelper.error(res, 'Failed to save form configuration', 500);
  }
};

/**
 * PATCH /api/admin-reports/:id/form-config/publish  (super_admin only)
 */
exports.publishFormConfig = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return ResponseHelper.error(res, 'Access denied', 403);
    }

    const formConfig = await AdminReportFormConfig.findOne({
      adminReport: req.params.id,
      ...buildFranchiseReadFilter(req)
    });

    if (!formConfig) {
      return ResponseHelper.error(res, 'Form configuration not found', 404);
    }

    const { isPublished } = req.body;
    formConfig.isPublished = typeof isPublished === 'boolean' ? isPublished : !formConfig.isPublished;
    if (formConfig.isPublished) formConfig.publishedAt = new Date();
    formConfig.updatedBy = req.user._id;
    await formConfig.save();

    // Sync isFormPublished back to the parent AdminReport
    await AdminReport.findByIdAndUpdate(req.params.id, {
      isFormPublished: formConfig.isPublished
    });

    return ResponseHelper.success(
      res,
      { isPublished: formConfig.isPublished, publishedAt: formConfig.publishedAt },
      `Form ${formConfig.isPublished ? 'published' : 'unpublished'} successfully`
    );
  } catch (error) {
    console.error('publishFormConfig error:', error);
    return ResponseHelper.error(res, 'Failed to update publish status', 500);
  }
};

// ── Submissions ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin-reports/:id/submissions
 * Super admin: all submissions with location filters.
 * Other admins: only their own submissions.
 */
exports.getSubmissions = async (req, res) => {
  try {
    const { district, area, unit, status, search, page = 1, limit = 20 } = req.query;

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    }).lean();

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    const filter = {
      adminReport: req.params.id,
      ...buildFranchiseReadFilter(req)
    };

    if (isSuperAdmin(req)) {
      // Legacy submissions were saved without a location; derive it from the
      // submitter's admin scope so location display and filters work.
      try {
        await backfillSubmissionLocations(req.params.id);
      } catch (backfillError) {
        console.error('backfillSubmissionLocations error:', backfillError);
      }

      if (status) filter.status = status;
      // Most specific selected location wins; expand to its descendants so a
      // district/area filter matches submissions tagged with child areas/units.
      const selectedLocation = unit || area || district;
      if (selectedLocation) {
        filter.location = { $in: await expandLocationIds(selectedLocation) };
      }
      if (search && search.trim()) {
        const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const [matchedUsers, matchedLocations] = await Promise.all([
          User.find({ name: regex }).select('_id').lean(),
          Location.find({ name: regex }).select('_id').lean()
        ]);
        filter.$or = [
          { submittedBy: { $in: matchedUsers.map((u) => u._id) } },
          { location: { $in: matchedLocations.map((l) => l._id) } }
        ];
      }
    } else {
      // Others see only their own; still allow status filter
      filter.submittedBy = req.user._id;
      if (status) filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      AdminReportSubmission.find(filter)
        .populate('submittedBy', 'name email role')
        .populate('location', 'name type code')
        .sort({ submittedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdminReportSubmission.countDocuments(filter)
    ]);

    return ResponseHelper.success(res, {
      submissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getSubmissions error:', error);
    return ResponseHelper.error(res, 'Failed to fetch submissions', 500);
  }
};

/**
 * GET /api/admin-reports/:id/submission-stats
 * Super admin: counts of targeted admins who have / haven't submitted,
 * honouring the same district/area/search filters as the submissions list.
 */
exports.getSubmissionStats = async (req, res) => {
  try {
    const { district, area, search } = req.query;

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    }).lean();

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    const [targeted, submittedUserIds] = await Promise.all([
      getTargetedMemberships(report),
      AdminReportSubmission.distinct('submittedBy', {
        adminReport: req.params.id,
        status: 'submitted'
      })
    ]);

    const submittedSet = new Set(submittedUserIds.map(String));
    const filtered = await filterMemberships(targeted, { district, area, search });
    const submittedCount = filtered.filter((m) => submittedSet.has(m.userId)).length;

    return ResponseHelper.success(res, {
      targetedTotal: filtered.length,
      submittedCount,
      notSubmittedCount: filtered.length - submittedCount
    });
  } catch (error) {
    console.error('getSubmissionStats error:', error);
    return ResponseHelper.error(res, 'Failed to fetch submission stats', 500);
  }
};

/**
 * GET /api/admin-reports/:id/non-submitters
 * Super admin: targeted admins who have not submitted this report yet.
 */
exports.getNonSubmitters = async (req, res) => {
  try {
    const { district, area, search, page = 1, limit = 15 } = req.query;

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    }).lean();

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    const [targeted, submittedUserIds] = await Promise.all([
      getTargetedMemberships(report),
      AdminReportSubmission.distinct('submittedBy', {
        adminReport: req.params.id,
        status: 'submitted'
      })
    ]);

    const submittedSet = new Set(submittedUserIds.map(String));
    const nonSubmitters = (await filterMemberships(targeted, { district, area, search }))
      .filter((m) => !submittedSet.has(m.userId))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;

    return ResponseHelper.success(res, {
      users: nonSubmitters.slice(start, start + limitNum),
      pagination: {
        total: nonSubmitters.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(nonSubmitters.length / limitNum))
      }
    });
  } catch (error) {
    console.error('getNonSubmitters error:', error);
    return ResponseHelper.error(res, 'Failed to fetch non-submitters', 500);
  }
};

/**
 * POST /api/admin-reports/:id/submissions
 * Create or update a draft submission.
 * Each user has at most one draft per report (upsert).
 */
exports.saveSubmission = async (req, res) => {
  try {
    const { formData, location } = req.body;
    const userRole = effectiveRole(req);

    const report = await AdminReport.findOne({
      _id: req.params.id,
      ...buildFranchiseReadFilter(req)
    }).lean();

    if (!report) return ResponseHelper.error(res, 'Report not found', 404);

    if (!isSuperAdmin(req)) {
      if (report.status !== 'active') {
        return ResponseHelper.error(res, 'This report is not accepting submissions', 400);
      }
      if (report.targetUserType !== userRole) {
        return ResponseHelper.error(res, 'You are not authorised to submit this report', 403);
      }
    }

    const franchiseId = getWriteFranchiseId(req);

    // Block if user has already submitted this report
    if (!isSuperAdmin(req)) {
      const alreadySubmitted = await AdminReportSubmission.findOne({
        adminReport: req.params.id,
        submittedBy: req.user._id,
        status: 'submitted',
        ...buildFranchiseReadFilter(req)
      });
      if (alreadySubmitted) {
        return ResponseHelper.error(res, 'You have already submitted this report', 400);
      }
    }

    // Upsert: one draft per user per report
    const submission = await AdminReportSubmission.findOneAndUpdate(
      {
        adminReport: req.params.id,
        submittedBy: req.user._id,
        status: 'draft',
        ...buildFranchiseReadFilter(req)
      },
      {
        $set: {
          formData: formData || {},
          submitterRole: userRole,
          location: location || resolveSubmitterLocation(req) || undefined,
          franchise: franchiseId
        },
        $setOnInsert: {
          adminReport: req.params.id,
          submittedBy: req.user._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return ResponseHelper.success(res, { submission }, 'Draft saved');
  } catch (error) {
    console.error('saveSubmission error:', error);
    return ResponseHelper.error(res, 'Failed to save submission', 500);
  }
};

/**
 * PATCH /api/admin-reports/:id/submissions/:submissionId/submit
 * Finalise a submission.
 */
exports.submitSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await AdminReportSubmission.findOne({
      _id: submissionId,
      adminReport: req.params.id,
      submittedBy: req.user._id,
      ...buildFranchiseReadFilter(req)
    });

    if (!submission) {
      return ResponseHelper.error(res, 'Submission not found', 404);
    }

    if (submission.status === 'submitted') {
      return ResponseHelper.error(res, 'This submission has already been submitted', 400);
    }

    // Also block if another submitted submission exists for this user + report
    const otherSubmitted = await AdminReportSubmission.findOne({
      adminReport: req.params.id,
      submittedBy: req.user._id,
      status: 'submitted',
      _id: { $ne: submission._id },
      ...buildFranchiseReadFilter(req)
    });
    if (otherSubmitted) {
      return ResponseHelper.error(res, 'You have already submitted this report', 400);
    }

    // Allow updating formData at submit time
    if (req.body.formData) {
      submission.formData = req.body.formData;
    }

    if (!submission.location) {
      const derivedLocation = resolveSubmitterLocation(req);
      if (derivedLocation) submission.location = derivedLocation;
    }

    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();

    // Increment analytics counter on the form config
    await AdminReportFormConfig.findOneAndUpdate(
      { adminReport: req.params.id },
      { $inc: { 'analytics.totalSubmissions': 1 } }
    );

    return ResponseHelper.success(res, { submission }, 'Report submitted successfully');
  } catch (error) {
    console.error('submitSubmission error:', error);
    return ResponseHelper.error(res, 'Failed to submit report', 500);
  }
};

/**
 * PATCH /api/admin-reports/:id/submissions/:submissionId
 * Update (edit) an existing submission (draft or submitted). Owner only.
 */
exports.updateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { formData } = req.body;

    const submission = await AdminReportSubmission.findOne({
      _id: submissionId,
      adminReport: req.params.id,
      submittedBy: req.user._id,
      ...buildFranchiseReadFilter(req)
    });

    if (!submission) {
      return ResponseHelper.error(res, 'Submission not found', 404);
    }

    if (formData !== undefined) {
      submission.formData = formData;
    }
    if (submission.status === 'submitted') {
      submission.submittedAt = new Date();
    }
    await submission.save();

    return ResponseHelper.success(res, { submission }, 'Submission updated successfully');
  } catch (error) {
    console.error('updateSubmission error:', error);
    return ResponseHelper.error(res, 'Failed to update submission', 500);
  }
};

/**
 * DELETE /api/admin-reports/:id/submissions/:submissionId
 * Delete a submission. Owner only.
 */
exports.deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await AdminReportSubmission.findOne({
      _id: submissionId,
      adminReport: req.params.id,
      submittedBy: req.user._id,
      ...buildFranchiseReadFilter(req)
    });

    if (!submission) {
      return ResponseHelper.error(res, 'Submission not found', 404);
    }

    const wasSubmitted = submission.status === 'submitted';
    await submission.deleteOne();

    if (wasSubmitted) {
      await AdminReportFormConfig.findOneAndUpdate(
        { adminReport: req.params.id },
        { $inc: { 'analytics.totalSubmissions': -1 } }
      );
    }

    return ResponseHelper.success(res, null, 'Submission deleted successfully');
  } catch (error) {
    console.error('deleteSubmission error:', error);
    return ResponseHelper.error(res, 'Failed to delete submission', 500);
  }
};
