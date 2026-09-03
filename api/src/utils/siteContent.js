const NewsEvent = require('../models/NewsEvent');
const Blog = require('../models/Blog');
const GalleryAlbum = require('../models/GalleryAlbum');
const Video = require('../models/Video');
const Project = require('../models/Project');
const ProjectPage = require('../models/ProjectPage');
const Brochure = require('../models/Brochure');
const Partner = require('../models/Partner');
const FAQ = require('../models/Faq');

// Helpers shared by the public website controllers (site pages, project pages, home).

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** Project statuses the public site is allowed to show. */
const PUBLIC_PROJECT_STATUSES = ['active', 'approved', 'completed'];

/**
 * Decorate public project records with their published detail page
 * (`pageSlug`, and `coverImageUrl` / `summary` overrides) so cards can link
 * to /projects-hub/:slug. Projects without a published page are returned as-is.
 */
async function attachProjectPages(projects, scope) {
  if (!projects || !projects.length) return projects || [];
  const pages = await ProjectPage.find({
    project: { $in: projects.map(p => p._id) },
    status: 'published',
    ...scope
  }).select('project slug coverImageUrl summary').lean();
  const byProject = new Map(pages.map(pg => [String(pg.project), pg]));
  return projects.map(p => {
    const pg = byProject.get(String(p._id));
    if (!pg) return p;
    return {
      ...p,
      pageSlug: pg.slug,
      coverImageUrl: pg.coverImageUrl || '',
      description: pg.summary || p.description
    };
  });
}

/** Fetch live content for a 'content' section from the matching collection. */
async function resolveContentSource(source, limit, scope) {
  const lim = Math.min(Math.max(parseInt(limit) || 6, 1), 24);
  switch (source) {
    case 'news':
      return NewsEvent.find({ status: 'published', ...scope }).sort({ publishDate: -1, createdAt: -1 }).limit(lim)
        .select('title description category imageUrl publishDate').lean();
    case 'blogs':
      return Blog.find({ status: 'published', ...scope }).sort({ publishDate: -1 }).limit(lim)
        .select('title slug excerpt author coverImageUrl category publishDate').lean();
    case 'gallery': {
      const albums = await GalleryAlbum.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).limit(lim)
        .select('title category coverImageUrl images').lean();
      return albums.map(a => ({
        _id: a._id,
        title: a.title,
        category: a.category,
        coverImageUrl: a.coverImageUrl || (a.images && a.images[0] && a.images[0].imageUrl) || '',
        imageCount: (a.images || []).length
      }));
    }
    case 'videos':
      return Video.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).limit(lim)
        .select('title description videoUrl thumbnailUrl category').lean();
    case 'projects': {
      const projects = await Project.find({ status: { $in: PUBLIC_PROJECT_STATUSES }, ...scope }).sort({ createdAt: -1 }).limit(lim)
        .select('name description category status').lean();
      return attachProjectPages(projects, scope);
    }
    case 'brochures':
      return Brochure.find({ status: 'active', ...scope }).sort({ createdAt: -1 }).limit(lim)
        .select('title description fileUrl fileName category').lean();
    case 'partners':
      return Partner.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).limit(lim)
        .select('name logoUrl link').lean();
    case 'faqs':
      return FAQ.find({ status: 'active', ...scope }).sort({ order: 1, createdAt: -1 }).limit(lim)
        .select('question answer category').lean();
    default:
      return [];
  }
}

/** Sort sections by `order` and fill `contentItems` on live-content sections. */
async function hydrateSections(sections, scope) {
  const sorted = (sections || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  await Promise.all(
    sorted
      .filter(s => s.type === 'content' && s.contentSource)
      .map(async s => {
        s.contentItems = await resolveContentSource(s.contentSource, s.contentLimit, scope);
      })
  );
  return sorted;
}

/** Collect every stored file key on a page (hero, sections, items, gallery) for cleanup. */
function collectImageKeys(page) {
  const keys = [];
  if (page.hero && page.hero.imageKey) keys.push(page.hero.imageKey);
  if (page.coverImageKey) keys.push(page.coverImageKey);
  (page.sections || []).forEach(s => {
    if (s.imageKey) keys.push(s.imageKey);
    (s.images || []).forEach(img => img.imageKey && keys.push(img.imageKey));
    (s.items || []).forEach(it => it.imageKey && keys.push(it.imageKey));
  });
  return keys;
}

module.exports = {
  slugify,
  PUBLIC_PROJECT_STATUSES,
  attachProjectPages,
  resolveContentSource,
  hydrateSections,
  collectImageKeys
};
