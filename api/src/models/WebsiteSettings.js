const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');
const orgConfig = require('../config/orgConfig');

// Header navigation — one link (menu item, dropdown child or action button)
const NAV_LINK_KINDS = ['home', 'section', 'builtin', 'page', 'donate', 'custom'];
const navLinkFields = {
  label: { type: String, default: '', trim: true, maxlength: 60 },
  // Where the link goes. 'donate' resolves to the donation payment link at render time.
  kind: { type: String, enum: NAV_LINK_KINDS, default: 'custom' },
  target: { type: String, default: '', trim: true, maxlength: 500 },
  openInNewTab: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
};
const navLinkSchema = new mongoose.Schema(navLinkFields, { _id: true });
const navItemSchema = new mongoose.Schema({
  ...navLinkFields,
  type: { type: String, enum: ['link', 'dropdown'], default: 'link' },
  children: [navLinkSchema]
}, { _id: true });
const navButtonSchema = new mongoose.Schema({
  ...navLinkFields,
  style: { type: String, enum: ['primary', 'outline'], default: 'primary' },
  icon: { type: String, default: '', maxlength: 30 }
}, { _id: true });

// Home page sections that can be reordered / hidden from Website Settings.
const HOME_SECTION_KEYS = [
  'counters', 'about', 'pages', 'projects', 'schemes', 'news', 'gallery', 'videos',
  'blogs', 'brochures', 'media', 'donation', 'partners', 'faq', 'contact'
];
const homeLayoutItemSchema = new mongoose.Schema({
  key: { type: String, enum: HOME_SECTION_KEYS, required: true },
  visible: { type: Boolean, default: true }
}, { _id: false });

const websiteSettingsSchema = new mongoose.Schema({
  // Order + visibility of the home page sections (array order = display order).
  homeLayout: [homeLayoutItemSchema],

  // Header / navigation bar. `customized: false` = automatic menu (built-in links + published pages).
  navigation: {
    customized: { type: Boolean, default: false },
    menuAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    items: [navItemSchema],
    buttons: [navButtonSchema]
  },

  // About Us Section
  aboutUs: {
    title: {
      type: String,
      default: function() { return `About ${orgConfig.erpTitle}`; }
    },
    description: {
      type: String,
      default: ''
    },
    imageUrl: { type: String, default: '' },
    imageKey: { type: String, default: '' }
  },

  // Hero Section (overlay text on top of banner slider)
  hero: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    secondaryCtaText: { type: String, default: '' },
    secondaryCtaLink: { type: String, default: '' }
  },

  // Site-wide colour palette (hex). Empty = the app's default theme.
  appearance: {
    primaryColor: { type: String, default: '' },
    gradientColor: { type: String, default: '' }
  },

  // Vision / Mission / Values
  vision: {
    title: { type: String, default: 'Our Vision' },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    color: { type: String, default: '' }
  },
  mission: {
    title: { type: String, default: 'Our Mission' },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    color: { type: String, default: '' }
  },
  values: [{
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: { type: String, default: 'heart' },
    color: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],

  // Donation / Giving info (account, UPI, payment button)
  donation: {
    enabled: { type: Boolean, default: false },
    heading: { type: String, default: '' },
    description: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
    paymentLink: { type: String, default: '' },
    qrImageUrl: { type: String, default: '' },
    qrImageKey: { type: String, default: '' }
  },

  // SEO metadata for the public site
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogImageUrl: { type: String, default: '' },
    ogImageKey: { type: String, default: '' }
  },

  // Footer
  footer: {
    description: { type: String, default: '' },
    copyrightText: { type: String, default: '' },
    links: [{
      label: { type: String, default: '' },
      url: { type: String, default: '' },
      order: { type: Number, default: 0 }
    }]
  },

  // Dynamic Stats Counters
  counts: [{
    title: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      required: true,
      default: 0
    },
    icon: {
      type: String,
      default: 'users'
    },
    color: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  // Contact Details
  contactDetails: {
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    whatsapp: {
      type: String,
      default: ''
    }
  },

  // Social Media Links
  socialMedia: {
    facebook: {
      type: String,
      default: ''
    },
    instagram: {
      type: String,
      default: ''
    },
    youtube: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    },
    linkedin: {
      type: String,
      default: ''
    }
  },

  // Audit
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

websiteSettingsSchema.plugin(franchisePlugin);

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
module.exports.NAV_LINK_KINDS = NAV_LINK_KINDS;
module.exports.HOME_SECTION_KEYS = HOME_SECTION_KEYS;
