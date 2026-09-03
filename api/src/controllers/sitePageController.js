const SitePage = require('../models/SitePage');
const { uploadToSpaces, deleteFromSpaces } = require('../utils/s3Upload');
const { buildFranchiseReadFilter } = require('../utils/franchiseFilterHelper');
const { slugify, hydrateSections, collectImageKeys } = require('../utils/siteContent');

// Reserved public-route slugs a dynamic page must not shadow
const RESERVED_SLUGS = ['news', 'blogs', 'gallery', 'videos', 'projects', 'public'];

/** Ensure the slug is unique within the franchise scope, appending -2, -3… if needed. */
async function uniqueSlug(base, scope, excludeId) {
  let slug = slugify(base) || 'page';
  if (RESERVED_SLUGS.includes(slug)) slug = `${slug}-page`;
  let candidate = slug;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await SitePage.findOne({
      slug: candidate,
      ...scope,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }).select('_id').lean();
    if (!clash) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

/**
 * Published pages for public nav + home overview cards.
 * GET /api/site-pages/public
 */
exports.getPublicList = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const pages = await SitePage.find({ status: 'published', ...scope })
      .sort({ navOrder: 1, homeOrder: 1, createdAt: 1 })
      .select('title slug navLabel navOrder showInNav showOnHome homeOrder summary hero.imageUrl hero.title')
      .lean();
    res.json({ success: true, data: pages });
  } catch (error) {
    console.error('Get public site pages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pages', error: error.message });
  }
};

/**
 * Full published page with dynamic content sections resolved.
 * GET /api/site-pages/public/:slug
 */
exports.getPublicBySlug = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const page = await SitePage.findOne({ slug: req.params.slug, status: 'published', ...scope })
      .select('-createdBy -updatedBy -__v')
      .lean();
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

    page.sections = await hydrateSections(page.sections, scope);

    res.json({ success: true, data: page });
  } catch (error) {
    console.error('Get public site page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch page', error: error.message });
  }
};

/**
 * Admin list (sections omitted to keep the payload light).
 * GET /api/site-pages
 */
exports.getAll = async (req, res) => {
  try {
    const filter = buildFranchiseReadFilter(req);
    if (req.query.status === 'draft' || req.query.status === 'published') filter.status = req.query.status;
    const pages = await SitePage.find(filter)
      .sort({ navOrder: 1, createdAt: -1 })
      .select('-sections')
      .lean();
    res.json({ success: true, data: pages });
  } catch (error) {
    console.error('Get site pages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pages', error: error.message });
  }
};

/**
 * GET /api/site-pages/:id
 */
exports.getById = async (req, res) => {
  try {
    const page = await SitePage.findOne({ _id: req.params.id, ...buildFranchiseReadFilter(req) });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (error) {
    console.error('Get site page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch page', error: error.message });
  }
};

/**
 * POST /api/site-pages
 */
exports.create = async (req, res) => {
  try {
    const { title, slug, hero, sections, status, showInNav, navLabel, navOrder, showOnHome, homeOrder, summary, seo } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const scope = buildFranchiseReadFilter(req);
    const finalSlug = await uniqueSlug(slug || title, scope);

    const page = new SitePage({
      title,
      slug: finalSlug,
      hero: hero || {},
      sections: sections || [],
      status: status || 'draft',
      showInNav: showInNav !== undefined ? !!showInNav : true,
      navLabel: navLabel || '',
      navOrder: navOrder || 0,
      showOnHome: showOnHome !== undefined ? !!showOnHome : true,
      homeOrder: homeOrder || 0,
      summary: summary || '',
      seo: seo || {},
      createdBy: req.user.id,
      franchise: req.franchiseId || null
    });
    await page.save();
    res.status(201).json({ success: true, data: page, message: 'Page created successfully' });
  } catch (error) {
    console.error('Create site page error:', error);
    res.status(500).json({ success: false, message: 'Failed to create page', error: error.message });
  }
};

/**
 * PUT /api/site-pages/:id
 */
exports.update = async (req, res) => {
  try {
    const page = await SitePage.findOne({ _id: req.params.id, ...buildFranchiseReadFilter(req) });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

    const { title, slug, hero, sections, status, showInNav, navLabel, navOrder, showOnHome, homeOrder, summary, seo } = req.body;
    if (title !== undefined) page.title = title;
    if (slug !== undefined && slugify(slug) !== page.slug) {
      page.slug = await uniqueSlug(slug, buildFranchiseReadFilter(req), page._id);
    }
    if (hero !== undefined) page.hero = hero;
    if (sections !== undefined) page.sections = sections;
    if (status !== undefined) page.status = status;
    if (showInNav !== undefined) page.showInNav = !!showInNav;
    if (navLabel !== undefined) page.navLabel = navLabel;
    if (navOrder !== undefined) page.navOrder = navOrder;
    if (showOnHome !== undefined) page.showOnHome = !!showOnHome;
    if (homeOrder !== undefined) page.homeOrder = homeOrder;
    if (summary !== undefined) page.summary = summary;
    if (seo !== undefined) page.seo = seo;
    page.updatedBy = req.user.id;
    await page.save();
    res.json({ success: true, data: page, message: 'Page updated successfully' });
  } catch (error) {
    console.error('Update site page error:', error);
    res.status(500).json({ success: false, message: 'Failed to update page', error: error.message });
  }
};

/**
 * DELETE /api/site-pages/:id
 */
exports.remove = async (req, res) => {
  try {
    const page = await SitePage.findOneAndDelete({ _id: req.params.id, ...buildFranchiseReadFilter(req) });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    await Promise.all(collectImageKeys(page).map(k => deleteFromSpaces(k).catch(() => {})));
    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Delete site page error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete page', error: error.message });
  }
};

/**
 * Upload one image for use inside a page (hero, section, card…).
 * The builder stores the returned URL/key in the page JSON.
 * POST /api/site-pages/upload-image
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file is required' });
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WebP or GIF images are allowed' });
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image must be 5MB or smaller' });
    }
    const result = await uploadToSpaces(req.file, 'site-pages');
    res.json({ success: true, data: { fileUrl: result.fileUrl, key: result.key } });
  } catch (error) {
    console.error('Site page image upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image', error: error.message });
  }
};
