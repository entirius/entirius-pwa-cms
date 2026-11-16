import { t } from "@/i18n";
import { formatDay } from "@/utils/format";

// The channel's custom fields (leads attribute definitions) as form fields — the `buildFields` shape of
// `aiTaskForm.js`: one entry per active definition in its order, the boot picked by `kind` in CustomFields.vue.
export const FIELD_KINDS = ["text", "number", "bool", "date", "select", "multiselect", "url"];
const URL_RE = /^https?:\/\/\S+$/i;

export function fieldsFromDefinitions(definitions = []) {
  return definitions
    .filter((definition) => definition.is_active !== false)
    .sort((a, b) => a.order - b.order)
    .map(({ key, kind, label, required, options }) => ({ key, kind, label, required: Boolean(required), options: options || [] }));
}

const isEmpty = (value) => value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length);

function errorOf(field, value) {
  if (isEmpty(value)) return field.required ? t("leads.fields.required_error") : "";
  if (field.kind === "number" && Number.isNaN(Number(String(value).replace(",", ".")))) return t("leads.fields.invalid_number");
  if (field.kind === "url" && !URL_RE.test(value)) return t("leads.fields.invalid_url");
  return "";
}

// { key: message } of the values that cannot be saved; empty = valid.
export function validateValues(fields, values) {
  return Object.fromEntries(fields.map((field) => [field.key, errorOf(field, values[field.key])]).filter(([, error]) => error));
}

const normalise = (field, value) => {
  if (isEmpty(value)) return null;
  return field.kind === "number" ? String(value).replace(",", ".") : value;
};

// Only the changed keys; an emptied value is `null` (the API removes the key).
export function changedValues(fields, values, before = {}) {
  const changed = fields.filter((field) => JSON.stringify(normalise(field, values[field.key])) !== JSON.stringify(normalise(field, before[field.key])));
  return Object.fromEntries(changed.map((field) => [field.key, normalise(field, values[field.key])]));
}

const optionLabel = (field, value) => field.options.find((option) => option.value === value)?.label ?? value;

// A stored value as the cards and the list read it; "" when unset.
export function formatValue(field, value) {
  if (isEmpty(value)) return "";
  if (field.kind === "bool") return t(value ? "leads.fields.yes" : "leads.fields.no");
  if (field.kind === "date") return formatDay(value);
  if (field.kind === "select") return optionLabel(field, value);
  if (field.kind === "multiselect") return [].concat(value).map((item) => optionLabel(field, item)).join(", ");
  return String(value);
}

// A deep copy of API data held in reactive state (structuredClone refuses Vue proxies).
export const plainCopy = (value) => JSON.parse(JSON.stringify(value));

// U16: the API's attribute key — `^[a-z][a-z0-9_]*$`, at most 48 characters.
export const KEY_MAX = 48;
const PL_LETTERS = { ł: "l", Ł: "l" }; // the one Polish letter NFD does not split into a base letter and a mark

/** "Pole testowe" → "pole_testowe", "Źródło leadu" → "zrodlo_leadu": the key a new field's label suggests ("" for no
 * letter or digit). A key that would start with a digit gets `field_` in front, as the API wants a letter first. */
export function keyFromLabel(label) {
  const base = (label || "")
    .replace(/[łŁ]/g, (letter) => PL_LETTERS[letter])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const key = /^[0-9]/.test(base) ? `field_${base}` : base;
  return key.slice(0, KEY_MAX).replace(/_+$/, "");
}
