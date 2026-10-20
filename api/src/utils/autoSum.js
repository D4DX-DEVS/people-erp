// Auto Sum form fields: an 'auto_sum' field holds the sum of the number fields
// listed in field.sumFields (field ids, from any page). The value is never taken
// from the client — it is recalculated from the source answers on submit, on
// admin edit, for scoring and for the PDF. Keep in sync with erp/src/lib/autoSum.ts.

const { parseCellNumber, tidy } = require('./tableTotals');

const AUTO_SUM_TYPE = 'auto_sum';

/** Field types an auto-sum field can add up */
const SUMMABLE_TYPES = ['number'];

/** Every field of the form, including section-nested ones, in form order */
function allFields(formConfig) {
  const pages = (formConfig && Array.isArray(formConfig.pages)) ? formConfig.pages : [];
  return pages.flatMap(page => [
    ...(page.fields || []),
    ...(Array.isArray(page.sections) ? page.sections.flatMap(s => s.fields || []) : [])
  ]).filter(Boolean);
}

function isSummableField(field) {
  return SUMMABLE_TYPES.includes(field.type) && field.enabled !== false;
}

/** Sum of the source answers; ids that no longer point at an enabled number field are skipped */
function computeAutoSum(field, formConfig, formData) {
  const ids = new Set((field.sumFields || []).map(Number));
  const total = allFields(formConfig)
    .filter(f => ids.has(Number(f.id)) && isSummableField(f))
    .reduce((sum, f) => sum + parseCellNumber(formData && formData[`field_${f.id}`]), 0);
  return tidy(total);
}

/** formData with every auto-sum field's value recalculated (same object when the form has none) */
function applyAutoSums(formData, formConfig) {
  const sumFields = allFields(formConfig).filter(f => f.type === AUTO_SUM_TYPE && f.enabled !== false);
  if (!formData || typeof formData !== 'object' || sumFields.length === 0) return formData;
  const next = { ...formData };
  for (const field of sumFields) next[`field_${field.id}`] = computeAutoSum(field, formConfig, formData);
  return next;
}

module.exports = { AUTO_SUM_TYPE, applyAutoSums, computeAutoSum };
