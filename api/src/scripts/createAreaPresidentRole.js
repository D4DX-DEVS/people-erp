/**
 * Create the missing `area_president` system role.
 *
 * The RBAC seed (rbacService.initializeSystemRoles) defines area_president,
 * but the role was never created in existing databases, so area_president
 * users resolve to zero permissions and receive 403s on dashboard endpoints.
 *
 * This script creates ONLY the area_president role (per franchise), leaving
 * every other role untouched. Safe to re-run: skips franchises that already
 * have the role.
 *
 * Usage: node src/scripts/createAreaPresidentRole.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/environment');

// Mirrors the seed definition in rbacService.js
const ROLE_DEF = {
  name: 'area_president',
  displayName: 'Area President',
  description: 'Area-level president with access to view and comment on all applications within their area',
  level: 4,
  category: 'admin',
  scopeConfig: {
    allowedScopeLevels: ['area'],
    defaultScopeLevel: 'area',
    allowMultipleScopes: false,
    maxScopes: 1
  },
  constraints: {
    maxUsers: 500,
    requiresApproval: false,
    isDeletable: true,
    isModifiable: true
  },
  permissions: [
    'users.read.regional',
    'roles.read',
    'permissions.read',
    'beneficiaries.read.regional',
    'applications.read.regional', 'applications.update.regional',
    'projects.read.assigned',
    'schemes.read.assigned',
    'reports.read',
    'dashboard.read.regional',
    'finances.read.regional',
    'donors.read.regional'
  ]
};

async function run() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const Role = require('../models/Role');
  const Permission = require('../models/Permission');
  const Franchise = require('../models/Franchise');

  const franchises = await Franchise.find({}).select('slug displayName');
  const scopes = franchises.length > 0
    ? franchises.map(f => ({ franchiseId: f._id, label: f.slug }))
    : [{ franchiseId: null, label: 'global' }];

  for (const { franchiseId, label } of scopes) {
    const roleQuery = franchiseId
      ? { name: ROLE_DEF.name, franchise: franchiseId }
      : { name: ROLE_DEF.name, franchise: { $exists: false } };
    const existing = await Role.findOne(roleQuery).setOptions({ bypassFranchise: true });
    if (existing) {
      console.log(`⏭️  [${label}] area_president already exists — skipping`);
      continue;
    }

    const permissionIds = [];
    const missing = [];
    for (const permissionName of ROLE_DEF.permissions) {
      const permQuery = franchiseId
        ? { name: permissionName, franchise: franchiseId }
        : { name: permissionName, franchise: { $exists: false } };
      const permission = await Permission.findOne(permQuery).setOptions({ bypassFranchise: true });
      if (permission) {
        permissionIds.push(permission._id);
      } else {
        missing.push(permissionName);
      }
    }

    const role = new Role({
      ...ROLE_DEF,
      type: 'system',
      permissions: permissionIds,
      isActive: true,
      ...(franchiseId && { franchise: franchiseId })
    });
    await role.save();

    console.log(`✅ [${label}] Created area_president with ${permissionIds.length} permissions`);
    if (missing.length) {
      console.log(`   ⚠️ Permissions not found in this franchise (skipped): ${missing.join(', ')}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
