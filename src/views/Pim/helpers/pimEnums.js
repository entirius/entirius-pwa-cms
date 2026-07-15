/**
 * PIM enum definitions matching django-pim FeatureType and FeatureScope.
 * Used across FeatureList, FeatureEdit, and FeatureSetEdit views.
 */

export const FEATURE_TYPES = [
  { value: 1, key: "bool", labelKey: "pim.type_bool" },
  { value: 2, key: "decimal", labelKey: "pim.type_decimal" },
  { value: 3, key: "varchar", labelKey: "pim.type_varchar" },
  { value: 4, key: "varchar_t9n", labelKey: "pim.type_varchar_t9n" },
  { value: 5, key: "text", labelKey: "pim.type_text" },
  { value: 6, key: "text_t9n", labelKey: "pim.type_text_t9n" },
  { value: 7, key: "select", labelKey: "pim.type_select" },
  { value: 8, key: "multiselect", labelKey: "pim.type_multiselect" },
  { value: 9, key: "json", labelKey: "pim.type_json" },
  { value: 10, key: "datetime", labelKey: "pim.type_datetime" },
  { value: 11, key: "json_t9n", labelKey: "pim.type_json_t9n" },
  { value: 12, key: "temperature", labelKey: "pim.type_temperature" },
  { value: 13, key: "length", labelKey: "pim.type_length" },
  { value: 14, key: "mass", labelKey: "pim.type_mass" },
]

export const FEATURE_SCOPES = [
  { value: 1, key: "system", labelKey: "pim.scope_system" },
  { value: 2, key: "global", labelKey: "pim.scope_global", deprecated: true },
  { value: 3, key: "business_unit", labelKey: "pim.scope_business_unit" },
]

/** Scopes available for creation/editing (excludes SYSTEM and deprecated GLOBAL) */
export const EDITABLE_SCOPES = FEATURE_SCOPES.filter(s => s.value === 3)

/** Scopes shown in list filters (excludes deprecated GLOBAL) */
export const FILTER_SCOPES = FEATURE_SCOPES.filter(s => !s.deprecated)

export const FRONTEND_INPUT_TYPES = [
  { value: 0, label: "Default" },
  { value: 1, label: "Swatch (Visual)" },
  { value: 2, label: "Swatch (Text)" },
  { value: 3, label: "Dropdown" },
  { value: 4, label: "Multi-select" },
  { value: 5, label: "Boolean" },
  { value: 6, label: "Slider" },
  { value: 7, label: "Price" },
  { value: 8, label: "Date" },
]

export const FILTER_TYPES = [
  { value: 0, label: "None" },
  { value: 1, label: "Range" },
  { value: 2, label: "List" },
  { value: 3, label: "Boolean" },
  { value: 4, label: "Date Range" },
  { value: 5, label: "Text" },
]

/** True for feature types that have selectable options (Attribute values) */
export function isSelectType(featureType) {
  return featureType === 7 || featureType === 8
}

export function featureTypeLabel(value) {
  const ft = FEATURE_TYPES.find(t => t.value === value)
  return ft ? ft.labelKey : String(value)
}

export function scopeLabel(value) {
  const s = FEATURE_SCOPES.find(sc => sc.value === value)
  return s ? s.labelKey : String(value)
}
