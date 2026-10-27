const Testimonial = require('../models/Testimonial');
const { uploadToSpaces, deleteFromSpaces } = require('../utils/s3Upload');
const { buildFranchiseReadFilter } = require('../utils/franchiseFilterHelper');
const { parseProjectLinks } = require('../utils/siteContent');

const PUBLIC_FIELDS = 'name designation location comment photoUrl';
const bool = (v) => v === true || v === 'true';

/** Plain text fields from a multipart body; undefined when not sent. */
function pickFields(body) {
  const out = {};
  ['name', 'designation', 'location', 'comment'].forEach((key) => {
    if (body[key] !== undefined) out[key] = String(body[key] || '').trim();
  });
  if (body.showOnHome !== undefined) out.showOnHome = bool(body.showOnHome);
  if (body.order !== undefined) out.order = parseInt(body.order, 10) || 0;
  if (body.status !== undefined) out.status = body.status === 'inactive' ? 'inactive' : 'active';
  return out;
}

const isImage = (file) => file && /^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype);

/** GET /api/testimonials/public — active testimonials marked for the home page. */
exports.getPublic = async (req, res) => {
  try {
    const items = await Testimonial.find({ status: 'active', showOnHome: true, ...buildFranchiseReadFilter(req) })
      .sort({ order: 1, createdAt: -1 })
      .select(PUBLIC_FIELDS)
      .lean();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get public testimonials error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials', error: error.message });
  }
};

/** GET /api/testimonials — admin list. */
exports.getAll = async (req, res) => {
  try {
    const filter = buildFranchiseReadFilter(req);
    if (req.query.status === 'active' || req.query.status === 'inactive') filter.status = req.query.status;
    const items = await Testimonial.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate('projects', 'name')
      .lean();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get testimonials error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials', error: error.message });
  }
};

/** POST /api/testimonials (multipart, optional `photo`). */
exports.create = async (req, res) => {
  try {
    const fields = pickFields(req.body);
    if (!fields.name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!fields.comment) return res.status(400).json({ success: false, message: 'Comment is required' });
    if (req.file && !isImage(req.file)) {
      return res.status(400).json({ success: false, message: 'Photo must be a JPG, PNG, WebP or GIF image' });
    }

    const item = new Testimonial({
      ...fields,
      ...(await parseProjectLinks(req.body, buildFranchiseReadFilter(req))),
      createdBy: req.user.id,
      franchise: req.franchiseId || null
    });
    if (req.file) {
      const upload = await uploadToSpaces(req.file, 'testimonials');
      item.photoUrl = upload.fileUrl;
      item.photoKey = upload.key;
    }
    await item.save();
    await item.populate('projects', 'name');
    res.status(201).json({ success: true, data: item, message: 'Testimonial created successfully' });
  } catch (error) {
    console.error('Create testimonial error:', error);
    res.status(500).json({ success: false, message: 'Failed to create testimonial', error: error.message });
  }
};

/** PUT /api/testimonials/:id (multipart). `removePhoto=true` clears the photo. */
exports.update = async (req, res) => {
  try {
    const item = await Testimonial.findOne({ _id: req.params.id, ...buildFranchiseReadFilter(req) });
    if (!item) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    if (req.file && !isImage(req.file)) {
      return res.status(400).json({ success: false, message: 'Photo must be a JPG, PNG, WebP or GIF image' });
    }

    const fields = pickFields(req.body);
    if (fields.name === '') return res.status(400).json({ success: false, message: 'Name is required' });
    if (fields.comment === '') return res.status(400).json({ success: false, message: 'Comment is required' });
    Object.assign(item, fields, await parseProjectLinks(req.body, buildFranchiseReadFilter(req)));

    if (req.file || bool(req.body.removePhoto)) {
      if (item.photoKey) await deleteFromSpaces(item.photoKey).catch(() => {});
      item.photoUrl = '';
      item.photoKey = '';
    }
    if (req.file) {
      const upload = await uploadToSpaces(req.file, 'testimonials');
      item.photoUrl = upload.fileUrl;
      item.photoKey = upload.key;
    }
    item.updatedBy = req.user.id;
    await item.save();
    await item.populate('projects', 'name');
    res.json({ success: true, data: item, message: 'Testimonial updated successfully' });
  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({ success: false, message: 'Failed to update testimonial', error: error.message });
  }
};

/** DELETE /api/testimonials/:id */
exports.remove = async (req, res) => {
  try {
    const item = await Testimonial.findOneAndDelete({ _id: req.params.id, ...buildFranchiseReadFilter(req) });
    if (!item) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    if (item.photoKey) await deleteFromSpaces(item.photoKey).catch(() => {});
    res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete testimonial', error: error.message });
  }
};

exports.PUBLIC_FIELDS = PUBLIC_FIELDS;
