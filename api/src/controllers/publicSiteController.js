const WebsiteSettings = require('../models/WebsiteSettings');
const Banner = require('../models/Banner');
const NewsEvent = require('../models/NewsEvent');
const Brochure = require('../models/Brochure');
const Partner = require('../models/Partner');
const Project = require('../models/Project');
const Scheme = require('../models/Scheme');
const FAQ = require('../models/Faq');
const GalleryAlbum = require('../models/GalleryAlbum');
const Video = require('../models/Video');
const Blog = require('../models/Blog');
const MediaCoverage = require('../models/MediaCoverage');
const SitePage = require('../models/SitePage');
const { buildFranchiseReadFilter } = require('../utils/franchiseFilterHelper');
const { attachProjectPages, PUBLIC_PROJECT_STATUSES } = require('../utils/siteContent');

/**
 * Aggregated public home payload — one call returns every section needed
 * to render the public landing page for the resolved franchise (by hostname).
 * GET /api/website/home
 */
exports.getHome = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);

    const [
      settings,
      banners,
      projects,
      schemes,
      news,
      blogs,
      gallery,
      videos,
      partners,
      brochures,
      faqs,
      media,
      pages
    ] = await Promise.all([
      WebsiteSettings.findOne({ ...scope }).select('-updatedBy -__v').lean(),
      Banner.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).select('-createdBy -updatedBy').lean(),
      Project.find({ status: { $in: ['active', 'approved', 'draft'] }, ...scope }).sort({ createdAt: -1 })
        .select('name description category status').lean(),
      Scheme.find({ status: 'active', ...scope }).sort({ createdAt: -1 }).limit(8)
        .select('name title description category status').lean(),
      NewsEvent.find({ status: 'published', ...scope }).sort({ publishDate: -1, createdAt: -1 }).limit(6)
        .select('title description category imageUrl publishDate featured').lean(),
      Blog.find({ status: 'published', ...scope }).sort({ publishDate: -1 }).limit(3)
        .select('title slug excerpt author coverImageUrl category publishDate').lean(),
      GalleryAlbum.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).limit(8)
        .select('title category coverImageUrl images').lean(),
      Video.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).limit(6)
        .select('title description videoUrl thumbnailUrl category featured').lean(),
      Partner.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).select('name logoUrl link').lean(),
      Brochure.find({ status: 'active', ...scope }).sort({ createdAt: -1 }).limit(8)
        .select('title description fileUrl fileName category').lean(),
      FAQ.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).select('question answer category').lean(),
      MediaCoverage.find({ status: 'active', ...scope }).sort({ order: 1, publishDate: -1 }).limit(8)
        .select('title source link imageUrl publishDate').lean(),
      SitePage.find({ status: 'published', ...scope }).sort({ navOrder: 1, homeOrder: 1, createdAt: 1 })
        .select('title slug navLabel navOrder showInNav showOnHome homeOrder summary hero.imageUrl hero.title').lean()
    ]);

    // Link project cards to their published detail pages (slug + cover image)
    const projectsWithPages = await attachProjectPages(projects || [], scope);

    // Trim gallery image payload to cover thumbnails for the home grid
    const gallerySummary = (gallery || []).map(a => ({
      _id: a._id,
      title: a.title,
      category: a.category,
      coverImageUrl: a.coverImageUrl || (a.images && a.images[0] && a.images[0].imageUrl) || '',
      imageCount: (a.images || []).length
    }));

    res.json({
      success: true,
      data: {
        settings: settings || {},
        banners: banners || [],
        projects: projectsWithPages,
        schemes: schemes || [],
        news: news || [],
        blogs: blogs || [],
        gallery: gallerySummary,
        videos: videos || [],
        partners: partners || [],
        brochures: brochures || [],
        faqs: faqs || [],
        media: media || [],
        pages: pages || []
      }
    });
  } catch (error) {
    console.error('Get public home error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch home content', error: error.message });
  }
};

/**
 * Public filterable projects hub.
 * GET /api/website/projects?category=&page=&limit=
 */
exports.getProjects = async (req, res) => {
  try {
    const scope = buildFranchiseReadFilter(req);
    const { category, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    // Public status filter: ongoing / completed. Drafts are never exposed here.
    const statusIn = status === 'completed'
      ? ['completed']
      : status === 'ongoing'
        ? ['active', 'approved']
        : PUBLIC_PROJECT_STATUSES;
    const filter = { status: { $in: statusIn }, ...scope };
    // Whitelist category — query params can arrive as objects (qs bracket
    // notation), which must never reach the Mongo filter on a public route.
    const PROJECT_CATEGORIES = ['education', 'healthcare', 'housing', 'livelihood', 'emergency_relief', 'infrastructure', 'social_welfare', 'other'];
    if (typeof category === 'string' && PROJECT_CATEGORIES.includes(category)) filter.category = category;

    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('name description category status').lean(),
      Project.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: await attachProjectPages(projects, scope),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get public projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error: error.message });
  }
};
