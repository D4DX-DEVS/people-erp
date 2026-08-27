/**
 * Profile fields a form-builder field can be auto-filled from.
 * Keep in sync with erp/src/lib/profileAutoFill.ts (PROFILE_SOURCES).
 */
const PROFILE_AUTOFILL_SOURCES = [
  // Identity
  'name',
  'phone',
  'email',
  // Personal
  'gender',
  'dateOfBirth',
  'age',
  // Location
  'district',
  'area',
  'unit',
  'state',
  'street',
  'pincode',
  'fullAddress',
  // Emergency contact
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
];

module.exports = { PROFILE_AUTOFILL_SOURCES };
