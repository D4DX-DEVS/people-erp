const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');

// A single item inside a section (card, stat, timeline entry, team member, FAQ, gallery image…)
const sectionItemSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },       // role (team), source, tag…
  description: { type: String, default: '' },    // card text / FAQ answer / timeline detail
  imageUrl: { type: String, default: '' },
  imageKey: { type: String, default: '' },
  icon: { type: String, default: '' },           // lucide icon name (stats/cards)
  link: { type: String, default: '' },
  value: { type: String, default: '' },          // stat value / timeline year
  order: { type: Number, default: 0 }
}, { _id: true });

// A content block on the page. `type` decides which fields are used.
const sectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['richtext', 'image-text', 'cards', 'stats', 'timeline', 'team', 'faq', 'cta', 'video', 'gallery', 'content'],
    required: true
  },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  content: { type: String, default: '' },        // richtext / image-text body
  imageUrl: { type: String, default: '' },       // image-text image
  imageKey: { type: String, default: '' },
  imagePosition: { type: String, enum: ['left', 'right'], default: 'right' },
  images: [{
    imageUrl: { type: String, default: '' },
    imageKey: { type: String, default: '' },
    caption: { type: String, default: '' }
  }],
  items: [sectionItemSchema],
  // 'content' sections embed live site content instead of manual items
  contentSource: {
    type: String,
    enum: ['', 'news', 'blogs', 'gallery', 'videos', 'projects', 'brochures', 'partners', 'faqs'],
    default: ''
  },
  contentLimit: { type: Number, default: 6 },
  videoUrl: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  columns: { type: Number, default: 3 },
  background: { type: String, enum: ['default', 'muted', 'primary'], default: 'default' },
  order: { type: Number, default: 0 }
}, { _id: true });

const sitePageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  hero: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imageKey: { type: String, default: '' }
  },
  sections: [sectionSchema],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  // Navigation
  showInNav: { type: Boolean, default: true },
  navLabel: { type: String, default: '' },
  navOrder: { type: Number, default: 0 },
  // Landing page overview card
  showOnHome: { type: Boolean, default: true },
  homeOrder: { type: Number, default: 0 },
  summary: { type: String, default: '' },
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

sitePageSchema.plugin(franchisePlugin);
sitePageSchema.index({ slug: 1, franchise: 1 }, { unique: true });
sitePageSchema.index({ status: 1, navOrder: 1 });

module.exports = mongoose.model('SitePage', sitePageSchema);
