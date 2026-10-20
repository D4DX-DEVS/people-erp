// Auto Sum form fields.
//
// An "auto_sum" field shows the sum of the number fields the admin picked in the
// form builder (field.sumFields: field ids, from any page of the form). Nobody
// types into it: the value is recalculated from the source answers on every
// render and written into formData on submit, and the API recalculates it again
// before saving, so a tampered value never sticks.
//
// Keep in sync with api/src/utils/autoSum.js (submit, admin edit, scoring, PDF).

import { parseCellNumber, tidy } from "@/lib/tableTotals";

export const AUTO_SUM_TYPE = "auto_sum";

/** Field types an auto-sum field can add up */
export const SUMMABLE_TYPES = ["number"];

export const DEFAULT_AUTO_SUM_LABEL = "Total";

interface SumFieldLike {
  id: number;
  type: string;
  label?: string;
  enabled?: boolean;
  sumFields?: number[];
}

interface SumFormLike {
  pages?: { fields?: SumFieldLike[]; sections?: { fields?: SumFieldLike[] }[] }[];
}

/** Every field of the form, including section-nested ones, in form order */
function allFields(formConfig: SumFormLike | null | undefined): SumFieldLike[] {
  return (formConfig?.pages || []).flatMap((page) => [
    ...(page.fields || []),
    ...(page.sections || []).flatMap((section) => section.fields || []),
  ]);
}

export function isSummableField(field: SumFieldLike): boolean {
  return SUMMABLE_TYPES.includes(field.type) && field.enabled !== false;
}

/**
 * The fields an auto-sum field adds up, in form order. Ids that no longer point
 * at an enabled number field (deleted, or switched to another type) are skipped.
 */
export function getSumSources(field: SumFieldLike, formConfig: SumFormLike | null | undefined): SumFieldLike[] {
  const ids = new Set(field.sumFields || []);
  return allFields(formConfig).filter((f) => ids.has(f.id) && isSummableField(f));
}

/** Sum of the source answers; blank or non-numeric answers count as 0 */
export function computeAutoSum(
  field: SumFieldLike,
  formConfig: SumFormLike | null | undefined,
  formData: Record<string, unknown> | null | undefined,
): number {
  return tidy(
    getSumSources(field, formConfig).reduce((sum, f) => sum + parseCellNumber(formData?.[`field_${f.id}`]), 0),
  );
}

/** formData with every auto-sum field's value recalculated (same object when the form has none) */
export function applyAutoSums<T extends Record<string, unknown>>(
  formData: T,
  formConfig: SumFormLike | null | undefined,
): T {
  const sumFields = allFields(formConfig).filter((f) => f.type === AUTO_SUM_TYPE && f.enabled !== false);
  if (!formData || typeof formData !== "object" || sumFields.length === 0) return formData;
  const next: Record<string, unknown> = { ...formData };
  for (const field of sumFields) next[`field_${field.id}`] = computeAutoSum(field, formConfig, formData);
  return next as T;
}
