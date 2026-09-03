const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');
const { sectionSchema, heroSchema } = require('./pageSectionSchema');

/**
 * Public detail page for one Project, built with the same section builder as
 * SitePage. One page per project per franchise; the public hub cards link to
 * it at /projects-hub/:slug once published.
 */
const projectPageSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  // Card text/image used on the home page, projects hub and content feeds.
  // Empty = fall back to the project's description / category stock image.
  summary: { type: String, default: '' },
  coverImageUrl: { type: String, default: '' },
  coverImageKey: { type: String, default: '' },
  hero: heroSchema,
  // Auto-generated "at a glance" strip fed from the Project record itself.
  overview: {
    visible: { type: Boolean, default: true },
    showDates: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    showBeneficiaries: { type: Boolean, default: true },
    showBudget: { type: Boolean, default: false },
    showMilestones: { type: Boolean, default: false },
    accentColor: { type: String, default: '' },   // swatch name or hex ('' = brand)
    background: { type: String, enum: ['default', 'muted', 'primary', 'tint', 'custom'], default: 'muted' },
    backgroundColor: { type: String, default: '' }
  },
  sections: [sectionSchema],
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

projectPageSchema.plugin(franchisePlugin);
projectPageSchema.index({ project: 1, franchise: 1 }, { unique: true });
projectPageSchema.index({ slug: 1, franchise: 1 }, { unique: true });

module.exports = mongoose.model('ProjectPage', projectPageSchema);
