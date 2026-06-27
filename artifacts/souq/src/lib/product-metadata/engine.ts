import { catalogField } from "./field-catalog";
import { FIELD_GROUPS } from "./field-groups";
import {
  CATEGORY_FIELD_GROUP_MAP,
  getFieldGroupIdForCategory,
  metadataCoverageStats,
} from "./category-map";
import {
  DEPENDENT_CLEAR_MAP,
  resolveOptionsFromMap,
} from "./model-maps";
import type {
  AdDetailSpecRow,
  MetadataValidationResult,
  ResolvedDynamicFieldDef,
} from "./types";

export type { DynamicFieldDef, ResolvedDynamicFieldDef } from "./types";
export { FIELD_GROUPS } from "./field-groups";
export { CATEGORY_FIELD_GROUP_MAP, metadataCoverageStats } from "./category-map";
export { FIELD_CATALOG } from "./field-catalog";

function resolveFieldOptions(
  field: ReturnType<typeof catalogField>,
  values: Record<string, string>,
): string[] {
  if (field.dependsOn && field.optionsMapKey) {
    const parent = values[field.dependsOn]?.trim();
    if (!parent) return [];
    const fromMap = resolveOptionsFromMap(field.optionsMapKey, parent);
    if (fromMap.length > 0) return fromMap;
  }
  return field.options ?? [];
}

function buildResolvedField(
  catalogKey: string,
  required: boolean,
  values: Record<string, string>,
): ResolvedDynamicFieldDef {
  const base = catalogField(catalogKey);
  const options = resolveFieldOptions(base, values);
  return {
    ...base,
    required,
    options,
  };
}

/** Resolve dynamic fields for Create Ad / Ad Detail — single public entry */
export function getCreateAdDynamicFields(
  categorySlug: string | undefined,
  subcategoryName: string | undefined,
  values: Record<string, string> = {},
): ResolvedDynamicFieldDef[] {
  const groupId = getFieldGroupIdForCategory(categorySlug, subcategoryName);
  if (!groupId) return [];
  const slots = FIELD_GROUPS[groupId];
  return slots.map((slot) =>
    buildResolvedField(slot.fieldId, Boolean(slot.required), values),
  );
}

/** Validate required metadata before publish */
export function validateProductMetadata(
  categorySlug: string | undefined,
  subcategoryName: string | undefined,
  values: Record<string, string>,
): MetadataValidationResult {
  const fields = getCreateAdDynamicFields(categorySlug, subcategoryName, values);
  const missing: MetadataValidationResult["missing"] = [];
  for (const field of fields) {
    if (!field.required) continue;
    const v = values[field.id]?.trim();
    if (!v) missing.push({ id: field.id, label: field.label });
  }
  return { ok: missing.length === 0, missing };
}

/** When parent field changes, return ids of dependent fields to clear */
export function getFieldsToClearOnChange(
  fieldId: string,
): string[] {
  return DEPENDENT_CLEAR_MAP[fieldId] ?? [];
}

export type AdDetailSpecRowExport = AdDetailSpecRow;

export function buildAdDetailSpecRows(
  parsedSpecs: Record<string, string>,
  categorySlug: string | undefined,
  subcategoryName: string | undefined,
  legacyManufacturer?: string | null,
): AdDetailSpecRow[] {
  const fields = getCreateAdDynamicFields(
    categorySlug,
    subcategoryName,
    parsedSpecs,
  );
  const rows: AdDetailSpecRow[] = [];

  if (
    legacyManufacturer?.trim() &&
    !parsedSpecs.manufacturer?.trim() &&
    !parsedSpecs.car_brand?.trim() &&
    fields.some((f) => f.id === "manufacturer" || f.id === "storage")
  ) {
    rows.push({
      id: "manufacturer",
      label: "الشركة المصنعة",
      value: legacyManufacturer.trim(),
    });
  }

  for (const field of fields) {
    const value = parsedSpecs[field.id]?.trim();
    if (!value) continue;
    rows.push({ id: field.id, label: field.label, value });
  }

  return rows;
}
