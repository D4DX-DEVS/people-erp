const WebsiteSettings = require('../models/WebsiteSettings');
const ResponseHelper = require('../utils/responseHelper');
const orgConfig = require('../config/orgConfig');
const { buildFranchiseReadFilter, buildFranchiseMatchStage, getWriteFranchiseId } = require('../utils/franchiseFilterHelper');
const { uploadToSpaces, deleteFromSpaces } = require('../utils/s3Upload');

const NAV_LINK_KINDS = WebsiteSettings.NAV_LINK_KINDS;
const MAX_NAV_ITEMS = 30;
const MAX_NAV_BUTTONS = 6;

// Public-facing links: never persist script URLs, cap lengths, and coerce every field to its expected type.
const cleanNavTarget = (value) => {
  const target = String(value || '').trim().slice(0, 500);
  return /^\s*(javascript|data|vbscript):/i.test(target) ? '' : target;
};
const cleanNavLink = (link, index) => {
  const l = link && typeof link === 'object' ? link : {};
  return {
    ...(l._id ? { _id: l._id } : {}),
    label: String(l.label || '').trim().slice(0, 60),
    kind: NAV_LINK_KINDS.includes(l.kind) ? l.kind : 'custom',
    target: cleanNavTarget(l.target),
    openInNewTab: !!l.openInNewTab,
    visible: l.visible !== false,
    order: index
  };
};
const sanitizeNavigation = (nav) => {
  const n = nav && typeof nav === 'object' ? nav : {};
  const items = (Array.isArray(n.items) ? n.items : []).slice(0, MAX_NAV_ITEMS).map((item, i) => ({
    ...cleanNavLink(item, i),
    type: item && item.type === 'dropdown' ? 'dropdown' : 'link',
    children: (item && Array.isArray(item.children) ? item.children : []).slice(0, MAX_NAV_ITEMS).map(cleanNavLink)
  }));
  const buttons = (Array.isArray(n.buttons) ? n.buttons : []).slice(0, MAX_NAV_BUTTONS).map((btn, i) => ({
    ...cleanNavLink(btn, i),
    style: btn && btn.style === 'outline' ? 'outline' : 'primary',
    icon: String((btn && btn.icon) || '').trim().slice(0, 30)
  }));
  return {
    customized: !!n.customized,
    menuAlignment: ['left', 'center', 'right'].includes(n.menuAlignment) ? n.menuAlignment : 'center',
    items,
    buttons
  };
};

const HOME_SECTION_KEYS = WebsiteSettings.HOME_SECTION_KEYS;
// Known keys only, no duplicates, and every section present so nothing silently disappears.
const sanitizeHomeLayout = (layout) => {
  const seen = new Set();
  const out = [];
  (Array.isArray(layout) ? layout : []).forEach((item) => {
    const key = item && typeof item === 'object' ? item.key : item;
    if (!HOME_SECTION_KEYS.includes(key) || seen.has(key)) return;
    seen.add(key);
    out.push({ key, visible: !(item && typeof item === 'object' && item.visible === false) });
  });
  HOME_SECTION_KEYS.forEach((key) => { if (!seen.has(key)) out.push({ key, visible: true }); });
  return out;
};

const cleanHex = (value) => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim()) ? String(value).trim() : '');

class WebsiteController {
  /**
   * Get website settings
   * GET /api/website/settings
   */
  async getSettings(req, res) {
    try {
      let settings = await WebsiteSettings.findOne({ ...buildFranchiseReadFilter(req) }).populate('updatedBy', 'name');
      
      // Create default settings if none exist
      if (!settings) {
        settings = await WebsiteSettings.create({
          franchise: req.franchiseId || null,
          aboutUs: {
            title: `About ${orgConfig.erpTitle}`,
            description: orgConfig.tagline
          },
          counts: [],
          contactDetails: {},
          socialMedia: {}
        });
      }

      return ResponseHelper.success(res, { settings }, 'Settings retrieved successfully');
    } catch (error) {
      console.error('❌ Get Settings Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Get public settings (no authentication required)
   * GET /api/website/public-settings
   */
  async getPublicSettings(req, res) {
    try {
      const settings = await WebsiteSettings.findOne({ ...buildFranchiseReadFilter(req) })
        .select('-updatedBy -__v -createdAt -updatedAt');
      
      if (!settings) {
        return ResponseHelper.success(res, {
          settings: {
            aboutUs: {},
            counts: [],
            contactDetails: {},
            socialMedia: {}
          }
        }, 'Settings retrieved successfully');
      }

      return ResponseHelper.success(res, { settings }, 'Settings retrieved successfully');
    } catch (error) {
      console.error('❌ Get Public Settings Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Update website settings
   * PUT /api/website/settings
   */
  async updateSettings(req, res) {
    try {
      let { aboutUs, counts, contactDetails, socialMedia, hero, vision, mission, values, donation, seo, footer, navigation, appearance, homeLayout } = req.body;
      const userId = req.user._id;

      // Parse JSON strings if they come from FormData
      const parseMaybe = (val) => (typeof val === 'string' ? JSON.parse(val) : val);
      aboutUs = parseMaybe(aboutUs);
      counts = parseMaybe(counts);
      contactDetails = parseMaybe(contactDetails);
      socialMedia = parseMaybe(socialMedia);
      hero = parseMaybe(hero);
      vision = parseMaybe(vision);
      mission = parseMaybe(mission);
      values = parseMaybe(values);
      donation = parseMaybe(donation);
      seo = parseMaybe(seo);
      footer = parseMaybe(footer);
      navigation = parseMaybe(navigation);
      appearance = parseMaybe(appearance);
      homeLayout = parseMaybe(homeLayout);

      // Normalize seo.keywords to an array (accept array or comma-separated string)
      if (seo && seo.keywords !== undefined) {
        if (Array.isArray(seo.keywords)) {
          seo.keywords = seo.keywords.map((k) => String(k).trim()).filter(Boolean);
        } else if (typeof seo.keywords === 'string') {
          seo.keywords = seo.keywords.split(',').map((k) => k.trim()).filter(Boolean);
        } else {
          seo.keywords = [];
        }
      }

      let settings = await WebsiteSettings.findOne({ franchise: req.franchiseId });
      
      if (!settings) {
        settings = new WebsiteSettings({ franchise: req.franchiseId || null });
      }

      // Update fields — merge aboutUs to preserve imageUrl/imageKey set via the dedicated upload endpoint
      if (aboutUs) settings.aboutUs = { ...(settings.aboutUs?.toObject ? settings.aboutUs.toObject() : settings.aboutUs || {}), ...aboutUs };
      if (counts) settings.counts = counts;
      if (contactDetails) settings.contactDetails = contactDetails;
      if (socialMedia) settings.socialMedia = socialMedia;
      if (hero) settings.hero = hero;
      if (vision) settings.vision = vision;
      if (mission) settings.mission = mission;
      if (values) settings.values = values;
      if (donation) settings.donation = donation;
      if (seo) settings.seo = seo;
      if (footer) settings.footer = footer;
      if (navigation) settings.navigation = sanitizeNavigation(navigation);
      if (homeLayout) settings.homeLayout = sanitizeHomeLayout(homeLayout);
      if (appearance) {
        settings.appearance = {
          primaryColor: cleanHex(appearance.primaryColor),
          gradientColor: cleanHex(appearance.gradientColor)
        };
      }
      
      settings.updatedBy = userId;
      await settings.save();

      settings = await settings.populate('updatedBy', 'name');

      return ResponseHelper.success(res, { settings }, 'Settings updated successfully');
    } catch (error) {
      console.error('❌ Update Settings Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Add counter
   * POST /api/website/settings/counter
   */
  async addCounter(req, res) {
    try {
      const { title, count, icon } = req.body;
      const userId = req.user._id;

      let settings = await WebsiteSettings.findOne({ franchise: req.franchiseId });
      if (!settings) {
        settings = new WebsiteSettings({ franchise: req.franchiseId || null });
      }

      const maxOrder = settings.counts.length > 0 
        ? Math.max(...settings.counts.map(c => c.order)) 
        : 0;

      settings.counts.push({
        title,
        count: count || 0,
        icon: icon || 'users',
        order: maxOrder + 1
      });

      settings.updatedBy = userId;
      await settings.save();

      return ResponseHelper.success(res, { settings }, 'Counter added successfully');
    } catch (error) {
      console.error('❌ Add Counter Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Update counter
   * PUT /api/website/settings/counter/:id
   */
  async updateCounter(req, res) {
    try {
      const { id } = req.params;
      const { title, count, icon, order } = req.body;
      const userId = req.user._id;

      const settings = await WebsiteSettings.findOne({ franchise: req.franchiseId });
      if (!settings) {
        return ResponseHelper.error(res, 'Settings not found', 404);
      }

      const counter = settings.counts.id(id);
      if (!counter) {
        return ResponseHelper.error(res, 'Counter not found', 404);
      }

      if (title) counter.title = title;
      if (count !== undefined) counter.count = count;
      if (icon) counter.icon = icon;
      if (order !== undefined) counter.order = order;

      settings.updatedBy = userId;
      await settings.save();

      return ResponseHelper.success(res, { settings }, 'Counter updated successfully');
    } catch (error) {
      console.error('❌ Update Counter Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Delete counter
   * DELETE /api/website/settings/counter/:id
   */
  async deleteCounter(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const settings = await WebsiteSettings.findOne({ franchise: req.franchiseId });
      if (!settings) {
        return ResponseHelper.error(res, 'Settings not found', 404);
      }

      settings.counts.pull(id);
      settings.updatedBy = userId;
      await settings.save();

      return ResponseHelper.success(res, { settings }, 'Counter deleted successfully');
    } catch (error) {
      console.error('❌ Delete Counter Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }
  /**
   * Upload About Us image
   * PUT /api/website/settings/about-image
   */
  async uploadAboutImage(req, res) {
    try {
      if (!req.file) {
        return ResponseHelper.error(res, 'Image file is required', 400);
      }

      let settings = await WebsiteSettings.findOne({ franchise: req.franchiseId });
      if (!settings) {
        settings = new WebsiteSettings({ franchise: req.franchiseId || null });
      }

      // Delete old image from S3 if exists
      if (settings.aboutUs?.imageKey) {
        await deleteFromSpaces(settings.aboutUs.imageKey).catch(() => {});
      }

      // Upload new image
      const uploadResult = await uploadToSpaces(req.file, 'website/about');
      if (!uploadResult.success) {
        return ResponseHelper.error(res, 'Failed to upload image to storage', 500);
      }

      // Merge into existing aboutUs (preserve title/description)
      const existing = settings.aboutUs?.toObject ? settings.aboutUs.toObject() : (settings.aboutUs || {});
      settings.aboutUs = { ...existing, imageUrl: uploadResult.fileUrl, imageKey: uploadResult.key };
      settings.updatedBy = req.user._id;
      await settings.save();

      return ResponseHelper.success(res, { imageUrl: uploadResult.fileUrl, imageKey: uploadResult.key }, 'About image updated successfully');
    } catch (error) {
      console.error('❌ Upload About Image Error:', error);
      return ResponseHelper.error(res, error.message, 500);
    }
  }
}

module.exports = new WebsiteController();
