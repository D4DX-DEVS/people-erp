const Project = require('../models/Project');
const ProjectPage = require('../models/ProjectPage');
const { deleteFromSpaces } = require('../utils/s3Upload');
const { buildFranchiseReadFilter } = require('../utils/franchiseFilterHelper');
const {
  slugify, hydrateSections, collectImageKeys, PUBLIC_PROJECT_STATUSES
} = require('../utils/siteContent');

const PROJECT_ADMIN_FIELDS = 'name code description category status startDate endDate';
const OVERVIEW_BACKGROUNDS = ['default', 'muted', 'primary', 'tint', 'custom'];

/** Ensure the slug is unique within the franchise scope, appending -2, -3… if needed. */
async function uniqueSlug(base, scope, excludeId) {
  const slug = slugify(base) || 'project';
  let candidate = slug;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await ProjectPage.findOne({
      slug: candidate,
      ...scope,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }).select('_id').lean();
    if (!clash) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

/** Only the toggles/colours we know about; everything else on `overview` is ignored. */
function sanitizeOverview(input, current) {
  const src = input && typeof input === 'object' ? input : {};
  const base = current || {};
  const bool = (key, fallback) => (src[key] !== undefined ? !!src[key] : (base[key] !== undefined ? base[key] : fallback));
  const str = (key) => (typeof src[key] === 'string' ? src[key].slice(0, 60) : (base[key] || ''));
  return {
    visible: bool('visible', true),
    showDates: bool('showDates', true),
    showProgress: bool('showProgress', true),
    showBeneficiaries: bool('showBeneficiaries', true),
    showBudget: bool('showBudget', false),
    showMilestones: bool('showMilestones', false),
    accentColor: str('accentColor'),
    background: OVERVIEW_BACKGROUNDS.includes(src.background) ? src.background : (base.background || 'muted'),
    backgroundColor: str('backgroundColor')
  };
}

/** Fields of the Project record the public page may show, gated by the page's overview toggles. */
function publicProjectSelect(overview) {
  const fields = ['name', 'code', 'description', 'category', 'status', 'startDate', 'endDate',
    'progress.percentage', 'targetBeneficiaries.estimated', 'targetBeneficiaries.actual'];
  if (overview && overview.showBudget) fields.push('budget.total', 'budget.spent', 'budget.currency');
  if (overview && overview.showMilestones) fields.push('progress.milestones');
  return fields.join(' ');
}

/**
 * Published project page + the public slice of its project.
 * GET /api/project-pages/public/:slug
 */
exports.getPublicBySlug = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const page = await ProjectPage.findOne({ slug: req.params.slug, status: 'published', ...scope })
      .select('-createdBy -updatedBy -__v')
      .lean();
    if (!page) return res.status(404).json({ success: false, message: 'Project page not found' });

    const project = await Project.findOne({ _id: page.project, status: { $in: PUBLIC_PROJECT_STATUSES }, ...scope })
      .select(publicProjectSelect(page.overview))
      .lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project page not found' });

    page.sections = await hydrateSections(page.sections, scope);
    res.json({ success: true, data: { page, project } });
  } catch (error) {
    console.error('Get public project page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project page', error: error.message });
  }
};

/**
 * Admin list: every project in scope with its page status (sections omitted).
 * GET /api/project-pages
 */
exports.getAll = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const [projects, pages] = await Promise.all([
      Project.find(scope).sort({ createdAt: -1 }).select(PROJECT_ADMIN_FIELDS).lean(),
      ProjectPage.find(scope).select('project slug status coverImageUrl updatedAt').lean()
    ]);
    const byProject = new Map(pages.map(pg => [String(pg.project), pg]));
    const rows = projects.map(project => ({
      project,
      page: byProject.get(String(project._id)) || null
    }));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get project pages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project pages', error: error.message });
  }
};

/**
 * Admin: one project + its page (null when not built yet).
 * GET /api/project-pages/:projectId
 */
exports.getByProject = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const project = await Project.findOne({ _id: req.params.projectId, ...scope }).select(PROJECT_ADMIN_FIELDS).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const page = await ProjectPage.findOne({ project: project._id, ...scope }).lean();
    res.json({ success: true, data: { project, page } });
  } catch (error) {
    console.error('Get project page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project page', error: error.message });
  }
};

/**
 * Admin: create or update the page for a project.
 * PUT /api/project-pages/:projectId
 */
exports.upsert = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const project = await Project.findOne({ _id: req.params.projectId, ...scope }).select('_id name').lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { slug, status, summary, coverImageUrl, coverImageKey, hero, overview, sections, seo } = req.body;
    let page = await ProjectPage.findOne({ project: project._id, ...scope });
    const created = !page;

    if (created) {
      page = new ProjectPage({
        project: project._id,
        slug: await uniqueSlug(slug || project.name, scope),
        createdBy: req.user.id,
        franchise: req.franchiseId || null
      });
    } else if (slug !== undefined && slugify(slug) !== page.slug) {
      page.slug = await uniqueSlug(slug || project.name, scope, page._id);
    }

    if (status === 'draft' || status === 'published') page.status = status;
    if (summary !== undefined) page.summary = String(summary || '');
    if (coverImageUrl !== undefined) page.coverImageUrl = String(coverImageUrl || '');
    if (coverImageKey !== undefined) page.coverImageKey = String(coverImageKey || '');
    if (hero !== undefined) page.hero = hero || {};
    if (overview !== undefined) page.overview = sanitizeOverview(overview, page.overview);
    if (sections !== undefined) page.sections = Array.isArray(sections) ? sections : [];
    if (seo !== undefined) page.seo = seo || {};
    page.updatedBy = req.user.id;
    await page.save();

    res.status(created ? 201 : 200).json({
      success: true,
      data: page,
      message: created ? 'Project page created successfully' : 'Project page updated successfully'
    });
  } catch (error) {
    console.error('Save project page error:', error);
    res.status(500).json({ success: false, message: 'Failed to save project page', error: error.message });
  }
};

/**
 * Admin: delete a project's page (the project itself is untouched).
 * DELETE /api/project-pages/:projectId
 */
exports.remove = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const page = await ProjectPage.findOneAndDelete({ project: req.params.projectId, ...scope });
    if (!page) return res.status(404).json({ success: false, message: 'Project page not found' });
    await Promise.all(collectImageKeys(page).map(k => deleteFromSpaces(k).catch(() => {})));
    res.json({ success: true, message: 'Project page deleted successfully' });
  } catch (error) {
    console.error('Delete project page error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project page', error: error.message });
  }
};
