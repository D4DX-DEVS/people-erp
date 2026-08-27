// Profile auto-fill for form-builder fields.
//
// A field only pulls a value from the beneficiary profile when the form builder
// explicitly configures it (field.autoFill = { enabled, source }). There is no
// label guessing — that produced wrong matches such as "Name of the Course"
// being filled with the applicant's name.

export interface BeneficiaryProfileUser {
  name?: string;
  phone?: string;
  email?: string;
  profile?: {
    gender?: string;
    dateOfBirth?: string;
    address?: {
      street?: string;
      area?: string;
      district?: string;
      state?: string;
      pincode?: string;
    };
    location?: {
      district?: { name?: string } | string;
      area?: { name?: string } | string;
      unit?: { name?: string } | string;
    };
    emergencyContact?: {
      name?: string;
      phone?: string;
      relation?: string;
    };
  };
}

export interface FieldAutoFill {
  enabled: boolean;
  source: string;
}

export interface ProfileSource {
  value: string;
  label: string;
  group: string;
  /** Form field types this profile value can be written into */
  fieldTypes: string[];
}

const TEXTUAL = ['text', 'textarea'];
const CHOICE = ['select', 'dropdown', 'radio'];

export const PROFILE_SOURCES: ProfileSource[] = [
  // Identity
  { value: 'name', label: 'Full Name', group: 'Identity', fieldTypes: [...TEXTUAL] },
  { value: 'phone', label: 'Phone Number', group: 'Identity', fieldTypes: ['phone', 'number', ...TEXTUAL] },
  { value: 'email', label: 'Email Address', group: 'Identity', fieldTypes: ['email', ...TEXTUAL] },

  // Personal
  { value: 'gender', label: 'Gender', group: 'Personal', fieldTypes: [...CHOICE, ...TEXTUAL] },
  { value: 'dateOfBirth', label: 'Date of Birth', group: 'Personal', fieldTypes: ['date', 'datetime', 'text'] },
  { value: 'age', label: 'Age (calculated from Date of Birth)', group: 'Personal', fieldTypes: ['number', 'text'] },

  // Location
  { value: 'district', label: 'District', group: 'Location', fieldTypes: [...CHOICE, ...TEXTUAL] },
  { value: 'area', label: 'Area', group: 'Location', fieldTypes: [...CHOICE, ...TEXTUAL] },
  { value: 'unit', label: 'Unit', group: 'Location', fieldTypes: [...CHOICE, ...TEXTUAL] },
  { value: 'state', label: 'State', group: 'Location', fieldTypes: [...CHOICE, ...TEXTUAL] },
  { value: 'street', label: 'Street / House Address', group: 'Location', fieldTypes: [...TEXTUAL] },
  { value: 'pincode', label: 'Pincode', group: 'Location', fieldTypes: ['number', ...TEXTUAL] },
  { value: 'fullAddress', label: 'Full Address (street, area, district, state, pincode)', group: 'Location', fieldTypes: [...TEXTUAL] },

  // Emergency contact
  { value: 'emergencyContactName', label: 'Emergency Contact Name', group: 'Emergency Contact', fieldTypes: [...TEXTUAL] },
  { value: 'emergencyContactPhone', label: 'Emergency Contact Phone', group: 'Emergency Contact', fieldTypes: ['phone', 'number', ...TEXTUAL] },
  { value: 'emergencyContactRelation', label: 'Emergency Contact Relation', group: 'Emergency Contact', fieldTypes: [...CHOICE, ...TEXTUAL] },
];

export const PROFILE_SOURCE_VALUES = PROFILE_SOURCES.map((s) => s.value);

/** Sources that can fill a field of the given type, in dropdown order. */
export function getProfileSourcesForType(type: string): ProfileSource[] {
  return PROFILE_SOURCES.filter((s) => s.fieldTypes.includes(type));
}

export function supportsProfileAutoFill(type: string): boolean {
  return getProfileSourcesForType(type).length > 0;
}

export function getProfileSourceLabel(source?: string | null): string {
  return PROFILE_SOURCES.find((s) => s.value === source)?.label || '';
}

/** Groups (in declaration order) present for a field type — used to build the dropdown. */
export function getProfileSourceGroups(type: string): { group: string; sources: ProfileSource[] }[] {
  const groups: { group: string; sources: ProfileSource[] }[] = [];
  getProfileSourcesForType(type).forEach((source) => {
    const existing = groups.find((g) => g.group === source.group);
    if (existing) existing.sources.push(source);
    else groups.push({ group: source.group, sources: [source] });
  });
  return groups;
}

/** Location refs come back either populated ({ name }) or as a raw id string. */
function locationName(location?: { name?: string } | string | null): string | null {
  if (!location) return null;
  if (typeof location === 'string') return null;
  return location.name || null;
}

function toISODate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function calculateAge(dateOfBirth?: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? String(age) : null;
}

/** Raw profile value for a source, without any field-type formatting. */
export function resolveProfileValue(source: string, user: BeneficiaryProfileUser): string | null {
  const profile = user.profile || {};
  const address = profile.address || {};
  const location = profile.location || {};
  const emergency = profile.emergencyContact || {};

  switch (source) {
    case 'name':
      return user.name || null;
    case 'phone':
      return user.phone || null;
    case 'email':
      return user.email || null;
    case 'gender':
      return profile.gender || null;
    case 'dateOfBirth':
      return toISODate(profile.dateOfBirth);
    case 'age':
      return calculateAge(profile.dateOfBirth);
    case 'district':
      return locationName(location.district) || address.district || null;
    case 'area':
      return locationName(location.area) || address.area || null;
    case 'unit':
      return locationName(location.unit) || null;
    case 'state':
      return address.state || null;
    case 'street':
      return address.street || null;
    case 'pincode':
      return address.pincode || null;
    case 'fullAddress': {
      const parts = [
        address.street,
        locationName(location.area) || address.area,
        locationName(location.district) || address.district,
        address.state,
        address.pincode,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : null;
    }
    case 'emergencyContactName':
      return emergency.name || null;
    case 'emergencyContactPhone':
      return emergency.phone || null;
    case 'emergencyContactRelation':
      return emergency.relation || null;
    default:
      return null;
  }
}

interface AutoFillableField {
  type: string;
  options?: string[];
  autoFill?: FieldAutoFill;
}

/**
 * Value to write into a field, or null when auto-fill is off / the profile has
 * no data for it. For option-based fields the value is snapped to the matching
 * option (profile stores "male", the dropdown may offer "Male").
 */
export function getFieldAutoFillValue(
  field: AutoFillableField,
  user: BeneficiaryProfileUser | null | undefined
): string | null {
  if (!user) return null;
  if (!field.autoFill?.enabled || !field.autoFill.source) return null;

  const value = resolveProfileValue(field.autoFill.source, user);
  if (!value) return null;

  const options = field.options?.filter(Boolean) || [];
  if (options.length > 0) {
    const match = options.find(
      (option) => String(option).trim().toLowerCase() === value.trim().toLowerCase()
    );
    return match ?? value;
  }

  return value;
}

/**
 * Auto-fill values for every configured field across the form's pages,
 * skipping fields the user (or a draft) has already filled.
 */
export function buildProfileAutoFillUpdates(
  pages: Array<{ fields?: Array<AutoFillableField & { id: number }> }>,
  user: BeneficiaryProfileUser | null | undefined,
  currentData: Record<string, unknown>
): Record<string, string> {
  const updates: Record<string, string> = {};
  if (!user) return updates;

  (pages || []).forEach((page) => {
    (page?.fields || []).forEach((field) => {
      const key = `field_${field.id}`;
      const existing = currentData[key];
      if (existing !== undefined && existing !== null && existing !== '') return;

      const value = getFieldAutoFillValue(field, user);
      if (value) updates[key] = value;
    });
  });

  return updates;
}
