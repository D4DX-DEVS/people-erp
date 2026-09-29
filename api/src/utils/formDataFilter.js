const FormConfiguration = require('../models/FormConfiguration');

// Dropdown field types whose options can be exposed as listing filters.
const FILTERABLE_TYPES = ['select', 'dropdown'];

/**
 * Filterable dropdown fields of a scheme's (non-renewal) form configuration.
 * `franchiseFilter` is the caller's buildFranchiseReadFilter(req) result.
 * Returns [{ id, key: 'field_<id>', label, options }].
 */
async function getFilterableFields(schemeId, franchiseFilter = {}) {
  if (!schemeId) return [];
  const formConfig = await FormConfiguration.findOne({ scheme: schemeId, isRenewalForm: { $ne: true }, ...franchiseFilter })
    .select('pages')
    .lean();
  if (!formConfig) return [];

  const fields = [];
  for (const page of formConfig.pages || []) {
    for (const field of page.fields || []) {
      if (!field.filterable || !field.enabled || !FILTERABLE_TYPES.includes(field.type)) continue;
      const options = (field.options || []).map(o => String(o).trim()).filter(Boolean);
      if (options.length === 0) continue;
      fields.push({ id: field.id, key: `field_${field.id}`, label: field.label, options });
    }
  }
  return fields;
}

/**
 * Parse the `formFilters` query param (JSON object of field key -> selected
 * option) and return a mongo filter on formData, restricted to fields that
 * are actually marked filterable for the scheme. Unknown keys and values that
 * are not one of the field's options are ignored.
 */
async function buildFormDataFilter(schemeId, rawFormFilters, franchiseFilter = {}) {
  if (!schemeId || !rawFormFilters) return {};

  let parsed = rawFormFilters;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const allowed = await getFilterableFields(schemeId, franchiseFilter);
  const filter = {};
  for (const field of allowed) {
    const value = parsed[field.key];
    if (value === undefined || value === null || value === '' || value === 'all') continue;
    const selected = String(value).trim();
    if (!field.options.includes(selected)) continue;
    filter[`formData.${field.key}`] = selected;
  }
  return filter;
}

module.exports = { getFilterableFields, buildFormDataFilter };
