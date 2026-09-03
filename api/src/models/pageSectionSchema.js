const mongoose = require('mongoose');

// Shared section schemas for the page builders (SitePage + ProjectPage).

// A single item inside a section (card, stat, timeline entry, team member, FAQ, gallery image…)
const sectionItemSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },       // role (team), source, tag…
  description: { type: String, default: '' },    // card text / FAQ answer / timeline detail
  imageUrl: { type: String, default: '' },
  imageKey: { type: String, default: '' },
  icon: { type: String, default: '' },           // lucide icon name (stats/cards)
  color: { type: String, default: '' },          // icon colour: swatch name or hex ('' = section accent)
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
  icon: { type: String, default: '' },           // lucide icon shown above the heading
  accentColor: { type: String, default: '' },    // swatch name or hex used for icons/highlights ('' = brand)
  backgroundColor: { type: String, default: '' },// hex, used when background === 'custom'
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
  background: { type: String, enum: ['default', 'muted', 'primary', 'tint', 'custom'], default: 'default' },
  order: { type: Number, default: 0 }
}, { _id: true });

const heroSchema = {
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imageKey: { type: String, default: '' }
};

module.exports = { sectionItemSchema, sectionSchema, heroSchema };
