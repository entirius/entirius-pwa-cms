// Pure helpers for the PIM quality-gaps highlighter (etap-05).
// Framework-free so list/detail logic unit-tests without mounting a view.

// StatusBadge variant per gap severity. Unknown/empty → neutral.
const SEVERITY_VARIANT = { critical: "negative", warning: "warning" };

export function gapBadgeVariant(severity) {
  return SEVERITY_VARIANT[severity] || "neutral";
}

// Quality state of a product row from its rollup fields:
//   "unevaluated" — never checked / ProductCustom (gap_evaluated_at null)
//   "gaps"        — has at least one open gap
//   "ok"          — evaluated, zero gaps
export function gapRowState(row) {
  if (!row || row.gap_evaluated_at == null) return "unevaluated";
  if (row.gap_worst_severity) return "gaps";
  return "ok";
}

// Soft-compat gate: does the product response carry the gap_* fields?
// Old PIM omits them entirely → no column, no findings call, no errors.
export function hasQualityFields(row) {
  return !!row && "gap_worst_severity" in row;
}

// Resolve a finding's label_t9n for the UI language, with fallbacks.
export function resolveGapLabel(finding, lang) {
  const t9n = (finding && finding.label_t9n) || {};
  const code = (lang || "en").toLowerCase();
  return t9n[code] || t9n.en || Object.values(t9n)[0] || (finding && finding.definition_key) || "";
}

// Build the bulk-findings query params from the active list filters.
export function findingsParams({ severity, onlySource } = {}) {
  const params = {};
  if (severity) params.severity = severity;
  if (onlySource) params.only_source = true;
  return params;
}
