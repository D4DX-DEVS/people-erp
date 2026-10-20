// Auto-totals for Row/Column (table) fields. Totals are derived from the cell
// values and never stored. Keep in sync with erp/src/lib/tableTotals.ts.

const DEFAULT_TOTALS_ROW_LABEL = 'SUM';
const DEFAULT_TOTALS_COLUMN_LABEL = 'Total';

/** True when every configured column of the table is a number column */
function isNumberTable(field) {
  const columnCount = Number(field?.columns) || 2;
  const types = Array.isArray(field?.columnTypes) ? field.columnTypes : [];
  return Array.from({ length: columnCount }, (_, c) => types[c]).every(t => t === 'number');
}

/**
 * The totals that should be shown for a field: { rowLabel, columnLabel } (a null
 * label means that totals row/column is off), or null when there are none.
 */
function getActiveTotals(field) {
  if (!field || !field.autoTotals || !isNumberTable(field)) return null;
  const { row, column } = field.autoTotals;
  const rowLabel = row && row.enabled ? ((row.label || '').trim() || DEFAULT_TOTALS_ROW_LABEL) : null;
  const columnLabel = column && column.enabled ? ((column.label || '').trim() || DEFAULT_TOTALS_COLUMN_LABEL) : null;
  if (rowLabel === null && columnLabel === null) return null;
  return { rowLabel, columnLabel };
}

/** Cell text -> number; blank or non-numeric cells count as 0 */
function parseCellNumber(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

// Strip binary floating point noise (0.1 + 0.2 -> 0.3)
const tidy = n => parseFloat(n.toFixed(8));

/**
 * Sum a table. Only the first `configuredColumns` columns count; `displayedColumns`
 * is how many columns the caller prints (columnTotals is null beyond the configured ones).
 */
function computeTableTotals(table, configuredColumns, displayedColumns = configuredColumns) {
  const rowTotals = table.map(row =>
    tidy(Array.from({ length: configuredColumns }, (_, c) => parseCellNumber(row && row[c])).reduce((a, b) => a + b, 0))
  );
  const columnTotals = Array.from({ length: displayedColumns }, (_, c) =>
    c < configuredColumns ? tidy(table.reduce((sum, row) => sum + parseCellNumber(row && row[c]), 0)) : null
  );
  return { columnTotals, rowTotals, grandTotal: tidy(rowTotals.reduce((a, b) => a + b, 0)) };
}

module.exports = { getActiveTotals, computeTableTotals, parseCellNumber, tidy };
