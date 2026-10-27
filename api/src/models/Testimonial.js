const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');

/**
 * A quote from a beneficiary, volunteer or partner, shown on the public site:
 * the home page testimonials band and/or the pages of chosen projects.
 */
const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [120, 'Name cannot exceed 120 characters']
  },
  // "Beneficiary", "Volunteer", "Project coordinator"…
  designation: { type: String, trim: true, default: '', maxlength: 120 },
  // Organisation, village or district — whatever places the person.
  location: { type: String, trim: true, default: '', maxlength: 120 },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  photoUrl: { type: String, default: '' },
  photoKey: { type: String, default: '' },

  showOnHome: { type: Boolean, default: true },
  // Also list it on the public page of the chosen projects (/projects-hub/:slug).
  showOnProjectPages: { type: Boolean, default: false },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],

  order: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

testimonialSchema.plugin(franchisePlugin);
testimonialSchema.index({ status: 1, order: 1 });
testimonialSchema.index({ projects: 1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
