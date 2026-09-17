const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');
const { sectionSchema, heroSchema } = require('./pageSectionSchema');

/**
 * Public detail page for one Scheme, built with the same section builder as
 * SitePage and ProjectPage. One page per scheme per franchise; the home page
 * and schemes list link to it at /schemes/:slug.
 *
 * The page is optional: a scheme with no record here still has a public detail
 * page, rendered from the scheme itself (see schemePageController.getPublicBySlug).
 * This model only exists to let an admin add a hero, extra sections and SEO
 * on top of that.
 */
const schemePageSchema = new mongoose.Schema({
  scheme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
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
  // Card text/image used on the home page and schemes list.
  // Empty = fall back to the scheme's description / category artwork.
  summary: { type: String, default: '' },
  coverImageUrl: { type: String, default: '' },
  coverImageKey: { type: String, default: '' },
  hero: heroSchema,
  // Auto-generated "at a glance" strip fed from the Scheme record itself.
  overview: {
    visible: { type: Boolean, default: true },
    showCategory: { type: Boolean, default: true },
    showBudget: { type: Boolean, default: false },
    showBeneficiaries: { type: Boolean, default: true },
    showDates: { type: Boolean, default: true },
    showEligibility: { type: Boolean, default: true },
    showDocuments: { type: Boolean, default: true },
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

schemePageSchema.plugin(franchisePlugin);
schemePageSchema.index({ scheme: 1, franchise: 1 }, { unique: true });
schemePageSchema.index({ slug: 1, franchise: 1 }, { unique: true });

module.exports = mongoose.model('SchemePage', schemePageSchema);
