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
  // Associates (Partners) listed on this project's page.
  associates: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '', maxlength: 120 },   // '' = "Our Associates"
    partners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Partner' }]
  },
  // Places the project works in, plotted on a Kerala (districts) or India
  // (states) map on the public page. district/state are worked out from the
  // boundaries when the point is placed, so the page can group and highlight.
  locationMap: {
    visible: { type: Boolean, default: false },
    region: { type: String, enum: ['kerala', 'india'], default: 'kerala' },
    title: { type: String, default: '', maxlength: 120 },     // '' = "Where We Work"
    subtitle: { type: String, default: '', maxlength: 300 },
    points: [{
      name: { type: String, required: true, maxlength: 120 },
      description: { type: String, default: '', maxlength: 500 },
      address: { type: String, default: '', maxlength: 300 },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      district: { type: String, default: '', maxlength: 80 },
      state: { type: String, default: '', maxlength: 80 }
    }]
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
