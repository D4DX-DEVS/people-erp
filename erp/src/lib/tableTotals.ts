// Auto-totals for Row/Column (table) fields.
//
// A table field can mark each column as "number". When EVERY column is a number
// column the admin may switch on a totals row (sums each column) and/or a totals
// column (sums each row). Totals are derived from the cell values on every render
// and are never stored in formData.
//
// Keep in sync with api/src/utils/tableTotals.js (used by the application PDF).

export type TableColumnType = "text" | "number";

export interface TableTotalsConfig {
  /** Extra row at the bottom that sums each column */
  row?: { enabled?: boolean; label?: string };
  /** Extra column on the right that sums each row */
  column?: { enabled?: boolean; label?: string };
}

export interface TableTotalsFieldConfig {
  columns?: number;
  columnTypes?: string[];
  autoTotals?: TableTotalsConfig;
}

export const DEFAULT_TOTALS_ROW_LABEL = "SUM";
export const DEFAULT_TOTALS_COLUMN_LABEL = "Total";

export function getColumnType(field: TableTotalsFieldConfig, columnIndex: number): TableColumnType {
  return field.columnTypes?.[columnIndex] === "number" ? "number" : "text";
}

/** True when every configured column of the table is a number column */
export function isNumberTable(field: TableTotalsFieldConfig): boolean {
  const columnCount = field.columns || 2;
  return Array.from({ length: columnCount }, (_, c) => getColumnType(field, c)).every((t) => t === "number");
}

export interface ActiveTotals {
  /** Label of the bottom totals row, or null when that row is off */
  rowLabel: string | null;
  /** Label of the right-hand totals column, or null when that column is off */
  columnLabel: string | null;
}

/**
 * The totals that should currently be shown for a field, or null for none.
 * Saved settings are ignored (not deleted) while any column is not a number column.
 */
export function getActiveTotals(field: TableTotalsFieldConfig | null | undefined): ActiveTotals | null {
  if (!field || !field.autoTotals || !isNumberTable(field)) return null;
  const { row, column } = field.autoTotals;
  const rowLabel = row?.enabled ? (row.label?.trim() || DEFAULT_TOTALS_ROW_LABEL) : null;
  const columnLabel = column?.enabled ? (column.label?.trim() || DEFAULT_TOTALS_COLUMN_LABEL) : null;
  if (rowLabel === null && columnLabel === null) return null;
  return { rowLabel, columnLabel };
}

/** Cell text -> number; blank or non-numeric cells count as 0 */
export function parseCellNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

// Strip binary floating point noise (0.1 + 0.2 -> 0.3)
export const tidy = (n: number): number => parseFloat(n.toFixed(8));

export interface TableTotals {
  /** One entry per displayed column; null for columns beyond the configured ones */
  columnTotals: (number | null)[];
  /** One entry per row */
  rowTotals: number[];
  grandTotal: number;
}

/**
 * Sum a table. Only the first `configuredColumns` columns count (those are the
 * columns the admin declared as numbers); `displayedColumns` is how many columns
 * the caller renders, which can exceed that when old data has extra columns.
 */
export function computeTableTotals(
  table: unknown[][],
  configuredColumns: number,
  displayedColumns: number = configuredColumns,
): TableTotals {
  const rowTotals = table.map((row) =>
    tidy(Array.from({ length: configuredColumns }, (_, c) => parseCellNumber(row?.[c])).reduce((a, b) => a + b, 0)),
  );
  const columnTotals = Array.from({ length: displayedColumns }, (_, c) =>
    c < configuredColumns ? tidy(table.reduce((sum: number, row) => sum + parseCellNumber(row?.[c]), 0)) : null,
  );
  return { columnTotals, rowTotals, grandTotal: tidy(rowTotals.reduce((a, b) => a + b, 0)) };
}

export function formatTotal(value: number | null): string {
  return value === null ? "" : String(value);
}
