const Scheme = require('../models/Scheme');
const SchemePage = require('../models/SchemePage');
const { deleteFromSpaces } = require('../utils/s3Upload');
const { buildFranchiseReadFilter } = require('../utils/franchiseFilterHelper');
const {
  slugify, hydrateSections, collectImageKeys, PUBLIC_SCHEME_STATUSES
} = require('../utils/siteContent');

const SCHEME_ADMIN_FIELDS = 'name code description category status imageUrl';
const OVERVIEW_BACKGROUNDS = ['default', 'muted', 'primary', 'tint', 'custom'];

/** Defaults used when a scheme has no SchemePage record of its own. */
const DEFAULT_OVERVIEW = {
  visible: true,
  showCategory: true,
  showBudget: false,
  showBeneficiaries: true,
  showDates: true,
  showEligibility: true,
  showDocuments: true,
  accentColor: '',
  background: 'muted',
  backgroundColor: ''
};

/** Ensure the slug is unique within the franchise scope, appending -2, -3… if needed. */
async function uniqueSlug(base, scope, excludeId) {
  const slug = slugify(base) || 'scheme';
  let candidate = slug;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await SchemePage.findOne({
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
  const bool = (key) => (src[key] !== undefined
    ? !!src[key]
    : (base[key] !== undefined ? base[key] : DEFAULT_OVERVIEW[key]));
  const str = (key) => (typeof src[key] === 'string' ? src[key].slice(0, 60) : (base[key] || ''));
  return {
    visible: bool('visible'),
    showCategory: bool('showCategory'),
    showBudget: bool('showBudget'),
    showBeneficiaries: bool('showBeneficiaries'),
    showDates: bool('showDates'),
    showEligibility: bool('showEligibility'),
    showDocuments: bool('showDocuments'),
    accentColor: str('accentColor'),
    background: OVERVIEW_BACKGROUNDS.includes(src.background) ? src.background : (base.background || 'muted'),
    backgroundColor: str('backgroundColor')
  };
}

/**
 * Fields of the Scheme record the public page may show, gated by the overview
 * toggles. `benefits` is always included — what a scheme actually gives is the
 * single most useful fact on the page, and it is not sensitive.
 */
function publicSchemeSelect(overview) {
  const fields = ['name', 'code', 'description', 'category', 'status', 'imageUrl', 'benefits'];
  if (overview.showBudget) fields.push('budget.total', 'budget.allocated', 'budget.currency');
  if (overview.showBeneficiaries) {
    fields.push('statistics.totalBeneficiaries', 'applicationSettings.maxBeneficiaries');
  }
  if (overview.showDates) fields.push('applicationSettings.startDate', 'applicationSettings.endDate');
  if (overview.showEligibility) fields.push('eligibility');
  return fields.join(' ');
}

/**
 * Published scheme page + the public slice of its scheme.
 *
 * Every active scheme resolves here, whether or not an admin has built a page:
 * when no published SchemePage matches the slug we fall back to the scheme whose
 * name slugifies to it and return a default page shell, so the "Learn More"
 * links on the home page always land on a real detail page.
 *
 * GET /api/scheme-pages/public/:slug
 */
exports.getPublicBySlug = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const slug = String(req.params.slug || '');

    const page = await SchemePage.findOne({ slug, status: 'published', ...scope })
      .select('-createdBy -updatedBy -__v')
      .lean();

    if (page) {
      const overview = { ...DEFAULT_OVERVIEW, ...(page.overview || {}) };
      const scheme = await Scheme.findOne({
        _id: page.scheme, status: { $in: PUBLIC_SCHEME_STATUSES }, ...scope
      }).select(publicSchemeSelect(overview)).lean();
      if (!scheme) return res.status(404).json({ success: false, message: 'Scheme page not found' });

      page.sections = await hydrateSections(page.sections, scope);
      return res.json({ success: true, data: { page, scheme } });
    }

    // No built page — render the scheme record itself. Matching on a slugified
    // name in JS rather than in the query because Scheme has no slug field;
    // the active set per franchise is small enough for this to be cheap.
    const candidates = await Scheme.find({ status: { $in: PUBLIC_SCHEME_STATUSES }, ...scope })
      .select(publicSchemeSelect(DEFAULT_OVERVIEW))
      .lean();
    const scheme = candidates.find(s => slugify(s.name || s.title) === slug);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme page not found' });

    return res.json({
      success: true,
      data: {
        page: { slug, status: 'published', overview: DEFAULT_OVERVIEW, sections: [], generated: true },
        scheme
      }
    });
  } catch (error) {
    console.error('Get public scheme page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheme page', error: error.message });
  }
};

/**
 * Admin list: every scheme in scope with its page status (sections omitted).
 * GET /api/scheme-pages
 */
exports.getAll = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const [schemes, pages] = await Promise.all([
      Scheme.find(scope).sort({ createdAt: -1 }).select(SCHEME_ADMIN_FIELDS).lean(),
      SchemePage.find(scope).select('scheme slug status coverImageUrl updatedAt').lean()
    ]);
    const byScheme = new Map(pages.map(pg => [String(pg.scheme), pg]));
    const rows = schemes.map(scheme => ({
      scheme,
      page: byScheme.get(String(scheme._id)) || null,
      // What the public URL is right now, with or without a built page.
      defaultSlug: slugify(scheme.name || scheme.title)
    }));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get scheme pages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheme pages', error: error.message });
  }
};

/**
 * Admin: one scheme + its page (null when not built yet).
 * GET /api/scheme-pages/:schemeId
 */
exports.getByScheme = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const scheme = await Scheme.findOne({ _id: req.params.schemeId, ...scope }).select(SCHEME_ADMIN_FIELDS).lean();
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found' });
    const page = await SchemePage.findOne({ scheme: scheme._id, ...scope }).lean();
    res.json({ success: true, data: { scheme, page } });
  } catch (error) {
    console.error('Get scheme page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheme page', error: error.message });
  }
};

/**
 * Admin: create or update the page for a scheme.
 * PUT /api/scheme-pages/:schemeId
 */
exports.upsert = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const scheme = await Scheme.findOne({ _id: req.params.schemeId, ...scope }).select('_id name title').lean();
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found' });

    const { slug, status, summary, coverImageUrl, coverImageKey, hero, overview, sections, seo } = req.body;
    let page = await SchemePage.findOne({ scheme: scheme._id, ...scope });
    const created = !page;

    if (created) {
      page = new SchemePage({
        scheme: scheme._id,
        slug: await uniqueSlug(slug || scheme.name || scheme.title, scope),
        createdBy: req.user.id,
        franchise: req.franchiseId || null
      });
    } else if (slug !== undefined && slugify(slug) !== page.slug) {
      page.slug = await uniqueSlug(slug || scheme.name || scheme.title, scope, page._id);
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
      message: created ? 'Scheme page created successfully' : 'Scheme page updated successfully'
    });
  } catch (error) {
    console.error('Save scheme page error:', error);
    res.status(500).json({ success: false, message: 'Failed to save scheme page', error: error.message });
  }
};

/**
 * Admin: delete a scheme's page (the scheme itself is untouched, and its
 * public detail page falls back to the generated one).
 * DELETE /api/scheme-pages/:schemeId
 */
exports.remove = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const page = await SchemePage.findOneAndDelete({ scheme: req.params.schemeId, ...scope });
    if (!page) return res.status(404).json({ success: false, message: 'Scheme page not found' });
    await Promise.all(collectImageKeys(page).map(k => deleteFromSpaces(k).catch(() => {})));
    res.json({ success: true, message: 'Scheme page deleted successfully' });
  } catch (error) {
    console.error('Delete scheme page error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete scheme page', error: error.message });
  }
};
