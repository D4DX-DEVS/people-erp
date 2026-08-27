/**
 * Generic Export Handler Factory
 * 
 * Creates Express route handlers for exporting data from any Mongoose model.
 * Supports CSV and JSON export formats with configurable column definitions.
 * 
 * Usage:
 *   const { createExportHandler } = require('../middleware/exportHandler');
 *   router.get('/export', hasPermission('resource.export'), createExportHandler(Model, options));
 */

const mongoose = require('mongoose');
const { convertToCSV } = require('../utils/csvHelper');
const { buildFranchiseReadFilter } = require('../utils/franchiseFilterHelper');
const { buildCoordinatorFilter, COORDINATOR_SCOPES } = require('../utils/coordinatorScope');
const ResponseHelper = require('../utils/responseHelper');

/**
 * Regional visibility for scoped admin roles.
 * Mirrors getUserRegionalFilter() in applicationController so an export returns
 * the same rows the corresponding list page shows, instead of every region.
 * Returns {} for models that have no district/area/unit field.
 */
function buildRegionalFilter(req, Model) {
  const role = req.userFranchise?.role || req.userRole || req.user?.role;
  if (!role || role === 'super_admin' || role === 'state_admin') return {};

  const adminScopeForRole = req.userFranchise?.adminScope || req.user?.adminScope;

  // Coordinators are scoped by assigned scheme/project, not by region.
  // Only applies to models that carry that field (e.g. Application).
  const coordinatorField = COORDINATOR_SCOPES[role]?.field;
  if (coordinatorField) {
    return Model.schema.path(coordinatorField)
      ? buildCoordinatorFilter(role, adminScopeForRole)
      : {};
  }

  const field =
    role === 'district_admin' ? 'district' :
    (role === 'area_admin' || role === 'area_president') ? 'area' :
    role === 'unit_admin' ? 'unit' : null;

  if (!field || !Model.schema.path(field)) return {};

  const toId = (ref) => {
    if (!ref) return null;
    if (ref instanceof mongoose.Types.ObjectId) return ref;
    if (typeof ref === 'object' && ref._id) return new mongoose.Types.ObjectId(ref._id.toString());
    return new mongoose.Types.ObjectId(ref.toString());
  };

  const adminScope = adminScopeForRole;

  if (adminScope?.regions && adminScope.regions.length > 0) {
    return { [field]: { $in: adminScope.regions.map(toId) } };
  }
  if (adminScope?.[field]) {
    return { [field]: toId(adminScope[field]) };
  }
  return {};
}

/**
 * Create an export handler for a Mongoose model
 * 
 * @param {import('mongoose').Model} Model - Mongoose model to query
 * @param {Object} options - Configuration options
 * @param {Array<Object>} options.columns - Column definitions for CSV
 * @param {string} options.columns[].header - CSV column header
 * @param {string} options.columns[].accessor - Dot-notation field path
 * @param {string} [options.columns[].type] - Value type: 'date','datetime','currency','number','boolean','array'
 * @param {Function} [options.columns[].transform] - Custom transform: (value, row) => string
 * @param {Array<Object>} [options.populate] - Mongoose populate config
 * @param {string} options.populate[].path - Field to populate
 * @param {string} options.populate[].select - Fields to select
 * @param {Object} [options.defaultSort] - Default sort object, e.g. { createdAt: -1 }
 * @param {number} [options.maxLimit=10000] - Maximum records to export
 * @param {string} options.filenamePrefix - Filename prefix for CSV download
 * @param {Function} [options.filterBuilder] - Build query from req.query: (query) => mongooseFilter
 * @param {string} [options.selectFields] - Mongoose select string to limit fields fetched
 * @returns {Function} Express route handler (req, res)
 */
function createExportHandler(Model, options) {
  const {
    columns,
    populate = [],
    defaultSort = { createdAt: -1 },
    maxLimit = 10000,
    filenamePrefix = 'export',
    filterBuilder = null,
    selectFields = null
  } = options;

  return async (req, res) => {
    try {
      const { format = 'json', ...filters } = req.query;

      // Build query filter
      let query = {};
      if (filterBuilder && typeof filterBuilder === 'function') {
        query = filterBuilder(filters, req);
      }

      // Tenant scope: never export rows belonging to another franchise.
      if (Model.schema.path('franchise')) {
        Object.assign(query, buildFranchiseReadFilter(req));
      }

      // Regional scope: a district/area/unit admin only exports their own region.
      Object.assign(query, buildRegionalFilter(req, Model));

      // Build the Mongoose query
      let dbQuery = Model.find(query);

      // Apply populate
      if (populate.length > 0) {
        for (const pop of populate) {
          dbQuery = dbQuery.populate(pop);
        }
      }

      // Apply field selection
      if (selectFields) {
        dbQuery = dbQuery.select(selectFields);
      }

      // Apply sort and limit
      dbQuery = dbQuery.sort(defaultSort).limit(maxLimit).lean();

      const data = await dbQuery;

      if (format === 'csv') {
        const csvString = convertToCSV(data, columns);

        if (!csvString) {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=${filenamePrefix}_empty.csv`);
          return res.send(columns.map(c => `"${c.header}"`).join(','));
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${filenamePrefix}_${dateStr}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        // Add BOM for Excel UTF-8 compatibility
        return res.send('\ufeff' + csvString);
      }

      // JSON format (default)
      return ResponseHelper.success(res, {
        records: data,
        total: data.length,
        exportedAt: new Date().toISOString()
      }, `${filenamePrefix} exported successfully`);

    } catch (error) {
      console.error(`❌ Export ${filenamePrefix} Error:`, error);
      return ResponseHelper.error(res, `Failed to export ${filenamePrefix}`, 500);
    }
  };
}

module.exports = { createExportHandler };
