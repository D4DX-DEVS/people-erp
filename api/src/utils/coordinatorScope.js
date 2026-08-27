/**
 * Scope helpers for the coordinator roles.
 *
 * scheme_coordinator and project_coordinator are scoped by ASSIGNMENT, not by
 * geography — they hold no adminScope.regions / district / area / unit. The
 * location-based filters used for district/area/unit admins therefore left
 * their queries completely unrestricted, so a scheme coordinator saw every
 * application in the franchise instead of only their assigned schemes.
 *
 * These helpers translate the assignment stored in adminScope.schemes /
 * adminScope.projects into query filters and per-record access checks.
 */

const mongoose = require('mongoose');

// role → { field on the Application document, key inside adminScope }
const COORDINATOR_SCOPES = {
  scheme_coordinator: { field: 'scheme', scopeKey: 'schemes' },
  project_coordinator: { field: 'project', scopeKey: 'projects' }
};

const isCoordinatorRole = (role) => Object.prototype.hasOwnProperty.call(COORDINATOR_SCOPES, role);

const toObjectId = (ref) => {
  if (!ref) return null;
  if (ref instanceof mongoose.Types.ObjectId) return ref;
  const raw = typeof ref === 'object' && ref._id ? ref._id : ref;
  const str = raw.toString();
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
};

const toIdString = (ref) => {
  const id = toObjectId(ref);
  return id ? id.toString() : null;
};

const getAssignedIds = (role, adminScope) => {
  const mapping = COORDINATOR_SCOPES[role];
  if (!mapping) return [];
  return (adminScope?.[mapping.scopeKey] || []).map(toObjectId).filter(Boolean);
};

/**
 * Query filter restricting a coordinator to their assigned schemes / projects.
 * Returns null when the role is not a coordinator role, so callers keep their
 * own (location-based) logic.
 *
 * A coordinator with nothing assigned matches NOTHING — an empty assignment
 * must never fall through to "sees everything".
 */
function buildCoordinatorFilter(role, adminScope) {
  const mapping = COORDINATOR_SCOPES[role];
  if (!mapping) return null;

  return { [mapping.field]: { $in: getAssignedIds(role, adminScope) } };
}

/**
 * Whether a coordinator may access one application.
 * Returns null when the role is not a coordinator role.
 */
function coordinatorCanAccess(role, adminScope, application) {
  const mapping = COORDINATOR_SCOPES[role];
  if (!mapping) return null;

  const target = toIdString(application?.[mapping.field]);
  if (!target) return false;

  return getAssignedIds(role, adminScope).some((id) => id.toString() === target);
}

/**
 * Merge a scope filter into a query filter so that a caller-supplied filter on
 * the same field (e.g. ?scheme=<id> from the UI) narrows the results instead of
 * overwriting the restriction — both conditions must hold.
 */
function applyScopeFilter(filter, scopeFilter) {
  Object.entries(scopeFilter || {}).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(filter, key)) {
      filter.$and = [...(filter.$and || []), { [key]: filter[key] }, { [key]: value }];
      delete filter[key];
    } else {
      filter[key] = value;
    }
  });
  return filter;
}

module.exports = {
  COORDINATOR_SCOPES,
  isCoordinatorRole,
  buildCoordinatorFilter,
  coordinatorCanAccess,
  applyScopeFilter
};
