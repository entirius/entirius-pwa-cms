import { t } from "@/i18n";

// U17: the column mapping of an import (leads `imports/preview/`, KONTRAKT-IMPORT) — the server proposes a CRM field
// for every column of the file, the user checks and corrects it, and the import runs with the approved mapping.
// Pure helpers; the table is ImportMapping.vue, the flow Import.vue.

export const IGNORE = "ignore";
// The server's level in the three words of the screen: sure, check it, not recognised.
const LEVELS = { certain: "sure", check: "check", unrecognised: "unknown" };
export const CONFIDENCE_TONES = { sure: "positive", check: "warning", unknown: "neutral", skipped: "neutral" };
// A company is told by its domain, its website or its contact's e-mail host: the import needs one of them.
export const IDENTITY_FIELDS = ["domain", "website", "email"];

const label = (key, fallback) => (t(key) === key ? fallback : t(key));

/**
 * The confidence of a column under `field`: the server's level while the proposal stands, a user's pick is sure, a
 * column the user took out of a proposal is "skipped" (their decision, not a failure to recognise it). A column the
 * server recognised but CRM has no field for (`no_crm_field`) is "check", not "not recognised".
 */
export function confidenceLevel(column, field = column.field) {
  if (!field || field === IGNORE) {
    if ((column.field || IGNORE) !== IGNORE) return "skipped";
    return column.level === "check" || column.reason === "no_crm_field" ? "check" : "unknown";
  }
  if (field !== column.field) return "sure";
  return LEVELS[column.level] || "check";
}

/** The mapping the server proposed, {column name: field | "ignore"}. */
export const proposedMapping = (columns) => Object.fromEntries(columns.map((column) => [column.name, column.field || IGNORE]));

/** A field's name on screen: a built-in one in the UI language by its key, a custom field by its own label. */
export const fieldLabel = (field) => (field.custom ? field.label : label(`leads.import.mapping.field.${field.key}`, field.label));

/** The group a field is listed under: company, contact, or a custom field of either. */
export const fieldGroup = (field) => `${field.entity === "contact" ? "contact" : "company"}${field.custom ? "_custom" : ""}`;

/** The select's options: Skip first, then every field named by its group. */
export function fieldOptions(fields) {
  return [
    { value: IGNORE, label: t("leads.import.mapping.skip") },
    ...fields.map((field) => ({ value: field.key, label: `${t(`leads.import.mapping.group.${fieldGroup(field)}`)} · ${fieldLabel(field)}` })),
  ];
}

/** The fields more than one column goes to: {field: [columns]} — the import waits until each field has one column. */
export function conflicts(mapping) {
  const byField = {};
  for (const [column, field] of Object.entries(mapping)) {
    if (field && field !== IGNORE) (byField[field] ||= []).push(column);
  }
  return Object.fromEntries(Object.entries(byField).filter(([, columns]) => columns.length > 1));
}

const NAME_PARTS = ["first_name", "last_name"];
const columnsOn = (mapping, fields) => Object.keys(mapping).filter((column) => fields.includes(mapping[column]));

/** The columns of a full name chosen together with a first or last name: the server refuses that pair (DUPLICATE_FIELD). */
export function nameConflict(mapping) {
  const full = columnsOn(mapping, ["full_name"]);
  const parts = columnsOn(mapping, NAME_PARTS);
  return full.length && parts.length ? [...full, ...parts] : [];
}

/** The mapping with one column moved to `field`. A user's pick is never undone behind their back: a clash shows. */
export const withField = (mapping, column, field) => ({ ...mapping, [column]: field || IGNORE });

export const hasIdentity = (mapping) => Object.values(mapping).some((field) => IDENTITY_FIELDS.includes(field));

/** The fields the preview table shows: the ones the rows carry (full name arrives split), in the field list's order. */
export function previewFields(fields, rows) {
  const used = new Set(rows.flatMap((row) => Object.keys(row.values || {})));
  return fields.filter((field) => used.has(field.key));
}

/** The mapping the import sends: every column of the file, a field or "ignore". */
export const mappingPayload = (columns, mapping) => Object.fromEntries(columns.map((column) => [column.name, mapping[column.name] || IGNORE]));

/** The words under a proposal: why it was skipped, else where it came from; "" when there is nothing to say. */
export function proposalNote(column) {
  if (column.reason === "duplicate_field") return t("leads.import.mapping.reason.duplicate_field", { column: column.conflict_with || "" });
  if (column.reason === "no_crm_field") {
    return t("leads.import.mapping.reason.no_crm_field", { concept: label(`leads.import.mapping.concept.${column.concept}`, column.concept || "") });
  }
  if (column.reason) return label(`leads.import.mapping.reason.${column.reason}`, column.reason);
  return column.source ? label(`leads.import.mapping.source.${column.source}`, "") : "";
}

/** "Where the columns went" after the import (`column_mapping` of the batch): one line per column. */
export function wentLines(applied, fields) {
  const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
  return (applied || []).map(({ column, field, label: fallback }) =>
    !field || field === IGNORE
      ? t("leads.import.mapping.went_skipped", { column })
      : t("leads.import.mapping.went", { column, field: byKey[field] ? fieldLabel(byKey[field]) : fallback || field })
  );
}

/** A 400 of the preview or the import in words, by its `issue`; the server's description, else `fallback`. */
export function importErrorText(err, fallback) {
  const detail = err?.response?.data?.details?.[0];
  if (detail?.issue) return label(`leads.import.mapping.issue.${detail.issue}`, detail.description || fallback);
  return null;
}
