const FormConfiguration = require('../models/FormConfiguration');

// Dropdown field types whose options can be exposed as listing filters.
const FILTERABLE_TYPES = ['select', 'dropdown'];

// Answerable field types, grouped by how their stored answer is compared:
// select/radio/yesno store the option text, checkbox a boolean, multiselect an
// array of options, number a number or numeric string, date 'YYYY-MM-DD'.
// Files, tables and layout fields are not filterable.
const QUESTION_KINDS = {
  select: 'choice',
  dropdown: 'choice',
  radio: 'choice',
  yesno: 'choice',
  checkbox: 'boolean',
  multiselect: 'multi',
  number: 'number',
  auto_sum: 'number',
  date: 'date',
  text: 'text',
  textarea: 'text',
  email: 'text',
  phone: 'text',
  url: 'text'
};

// Operators each kind accepts in a `formRules` condition.
const OPS_BY_KIND = {
  choice: ['in', 'nin', 'empty', 'not_empty'],
  multi: ['in', 'nin', 'empty', 'not_empty'],
  boolean: ['checked', 'unchecked'],
  number: ['eq', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'not_empty'],
  date: ['on', 'before', 'after', 'between', 'empty', 'not_empty'],
  text: ['contains', 'equals', 'empty', 'not_empty']
};

const MAX_RULES = 20;
const MAX_TEXT_LENGTH = 200;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_ANSWERS = [null, '', []];
const CHECKED_ANSWERS = [true, 'true', 'Yes', 'yes'];

async function loadFormPages(schemeId, franchiseFilter) {
  if (!schemeId) return [];
  const formConfig = await FormConfiguration.findOne({ scheme: schemeId, isRenewalForm: { $ne: true }, ...franchiseFilter })
    .select('pages')
    .lean();
  return formConfig?.pages || [];
}

const cleanOptions = (options) => (options || []).map(o => String(o).trim()).filter(Boolean);

/**
 * Filterable dropdown fields of a scheme's (non-renewal) form configuration.
 * `franchiseFilter` is the caller's buildFranchiseReadFilter(req) result.
 * Returns [{ id, key: 'field_<id>', label, options }].
 */
async function getFilterableFields(schemeId, franchiseFilter = {}) {
  const fields = [];
  for (const page of await loadFormPages(schemeId, franchiseFilter)) {
    for (const field of page.fields || []) {
      if (!field.filterable || !field.enabled || !FILTERABLE_TYPES.includes(field.type)) continue;
      const options = cleanOptions(field.options);
      if (options.length === 0) continue;
      fields.push({ id: field.id, key: `field_${field.id}`, label: field.label, options });
    }
  }
  return fields;
}

/**
 * Every answerable question of a scheme's (non-renewal) form, for the
 * advanced question filters and the "export with answers" columns.
 * Returns [{ id, key, label, type, kind, options, page }].
 */
async function getQuestionFields(schemeId, franchiseFilter = {}) {
  const questions = [];
  for (const page of await loadFormPages(schemeId, franchiseFilter)) {
    for (const field of page.fields || []) {
      const kind = QUESTION_KINDS[field.type];
      if (!kind || field.enabled === false) continue;
      let options = [];
      if (kind === 'choice' || kind === 'multi') {
        options = cleanOptions(field.options);
        if (field.type === 'yesno' && options.length === 0) options = ['Yes', 'No'];
      }
      questions.push({
        id: field.id,
        key: `field_${field.id}`,
        label: field.label,
        type: field.type,
        kind,
        options,
        page: page.title || ''
      });
    }
  }
  return questions;
}

function parseJsonParam(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Parse the `formFilters` query param (JSON object of field key -> selected
 * option) and return a mongo filter on formData, restricted to fields that
 * are actually marked filterable for the scheme. Unknown keys and values that
 * are not one of the field's options are ignored.
 */
async function buildFormDataFilter(schemeId, rawFormFilters, franchiseFilter = {}) {
  if (!schemeId || !rawFormFilters) return {};

  const parsed = parseJsonParam(rawFormFilters);
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

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Option answers match case- and surrounding-space-insensitively ("male " = "Male").
const exactAnswer = (v) => new RegExp(`^\\s*${escapeRegex(v)}\\s*$`, 'i');

const toNumber = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toDate = (v) => (typeof v === 'string' && DATE_ONLY.test(v) ? v : null);

// Numeric value of an answer stored as a number or a string like "25,000";
// null when it is missing or not a number.
function numericAnswerExpr(path) {
  const asString = { $convert: { input: `$${path}`, to: 'string', onError: '', onNull: '' } };
  return {
    $convert: {
      input: { $replaceAll: { input: { $trim: { input: asString } }, find: ',', replacement: '' } },
      to: 'double',
      onError: null,
      onNull: null
    }
  };
}

function numberCondition(path, comparisons) {
  return {
    $expr: {
      $let: {
        vars: { n: numericAnswerExpr(path) },
        // Unanswered/non-numeric answers never match (null sorts below numbers)
        in: { $and: [{ $ne: ['$$n', null] }, ...comparisons.map(([op, v]) => ({ [op]: ['$$n', v] }))] }
      }
    }
  };
}

/**
 * Mongo condition for one rule against its question, or null when the rule
 * is incomplete or invalid (unknown operator, value not an option, ...).
 */
function buildRuleCondition(question, rule) {
  const { kind, options } = question;
  const { op } = rule;
  if (!OPS_BY_KIND[kind].includes(op)) return null;
  const path = `formData.${question.key}`;

  if (op === 'empty') return { [path]: { $in: EMPTY_ANSWERS } };
  if (op === 'not_empty') return { [path]: { $nin: EMPTY_ANSWERS } };

  switch (kind) {
    case 'choice':
    case 'multi': {
      const lower = options.map(o => o.toLowerCase());
      const values = (Array.isArray(rule.values) ? rule.values : [])
        .map(v => String(v).trim())
        .filter(v => lower.includes(v.toLowerCase()));
      if (values.length === 0) return null;
      // Arrays (multiselect) match when any element matches
      return { [path]: { [op === 'in' ? '$in' : '$nin']: values.map(exactAnswer) } };
    }
    case 'boolean':
      return { [path]: { [op === 'checked' ? '$in' : '$nin']: CHECKED_ANSWERS } };
    case 'number': {
      const a = toNumber(rule.value);
      if (a === null) return null;
      if (op === 'between') {
        const b = toNumber(rule.value2);
        if (b === null) return null;
        return numberCondition(path, [['$gte', Math.min(a, b)], ['$lte', Math.max(a, b)]]);
      }
      return numberCondition(path, [[`$${op}`, a]]);
    }
    case 'date': {
      const a = toDate(rule.value);
      if (!a) return null;
      if (op === 'on') return { [path]: a };
      if (op === 'before') return { [path]: { $lt: a, $ne: '' } };
      if (op === 'after') return { [path]: { $gt: a } };
      const b = toDate(rule.value2);
      if (!b) return null;
      return { [path]: { $gte: a < b ? a : b, $lte: a < b ? b : a } };
    }
    case 'text': {
      const text = String(rule.value ?? '').trim().slice(0, MAX_TEXT_LENGTH);
      if (!text) return null;
      return op === 'equals'
        ? { [path]: exactAnswer(text) }
        : { [path]: { $regex: escapeRegex(text), $options: 'i' } };
    }
    default:
      return null;
  }
}

/**
 * Parse the `formRules` query param — JSON { match: 'all'|'any', rules: [{
 * key, op, values?, value?, value2? }] } — into one mongo condition on the
 * scheme's form answers, or null when no rule is usable. Rules are validated
 * against the scheme's own questions, so arbitrary formData paths cannot be
 * queried through the query string.
 */
async function buildFormRulesFilter(schemeId, rawFormRules, franchiseFilter = {}) {
  if (!schemeId || !rawFormRules) return null;

  const parsed = parseJsonParam(rawFormRules);
  const rules = Array.isArray(parsed?.rules) ? parsed.rules.slice(0, MAX_RULES) : [];
  if (rules.length === 0) return null;

  const questions = new Map((await getQuestionFields(schemeId, franchiseFilter)).map(q => [q.key, q]));
  const conditions = rules
    .map(rule => (rule && questions.has(rule.key) ? buildRuleCondition(questions.get(rule.key), rule) : null))
    .filter(Boolean);
  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return parsed.match === 'any' ? { $or: conditions } : { $and: conditions };
}

/**
 * CSV columns holding the answer to each question of the scheme's form.
 */
async function getAnswerColumns(schemeId, franchiseFilter = {}) {
  const questions = await getQuestionFields(schemeId, franchiseFilter);
  return questions.map(q => ({
    header: q.label,
    accessor: `formData.${q.key}`,
    ...(q.kind === 'boolean' && { transform: (v) => (v === undefined || v === null || v === '' ? v : CHECKED_ANSWERS.includes(v)), type: 'boolean' }),
    ...(q.kind === 'multi' && { type: 'array' })
  }));
}

module.exports = {
  getFilterableFields,
  getQuestionFields,
  buildFormDataFilter,
  buildFormRulesFilter,
  getAnswerColumns
};
