const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');

const { sectionSchema, heroSchema } = require('./pageSectionSchema');

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
  hero: heroSchema,
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
