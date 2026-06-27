/**
 * @deprecated Import from `@/lib/product-metadata/engine` — thin re-export for compatibility.
 */
export {
  getCreateAdDynamicFields,
  buildAdDetailSpecRows,
  validateProductMetadata,
  getFieldsToClearOnChange,
  metadataCoverageStats,
  FIELD_GROUPS,
  CATEGORY_FIELD_GROUP_MAP,
} from "./product-metadata/engine";

export type {
  DynamicFieldDef,
  ResolvedDynamicFieldDef,
  AdDetailSpecRow,
  MetadataValidationResult,
} from "./product-metadata/types";
