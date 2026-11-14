import { t } from "@/i18n";
import { useFormErrors } from "@/composables/useFormErrors";

// T7 (walk 4): the forms of the Leads settings say what a field lacks in the panel's words. A required field left
// empty is caught before the request and named ("Give the key"); a field error of the API is shown on its field from
// a map of known messages, anything else as "Check this field" — the API's raw text is never printed.
const API_MESSAGES = [
  [/at least 1 (character|item)|field required|is required|may not be (blank|null)|must not be empty/i, null],
  [/at most \d+ character|no more than \d+ character|too long/i, "too_long"],
  [/already exists|already in use|unique|duplicate/i, "taken"],
  [/valid e-?mail/i, "email"],
  [/pattern|slug|letters, (numbers|digits)/i, "format"],
  [/valid (integer|number)|greater than|less than/i, "number"],
];

const blank = (value) => value === null || value === undefined || (typeof value === "string" ? !value.trim() : Array.isArray(value) && !value.length);

// "Give the key" for a field the form names; "Fill in this field" for one it does not.
export function giveText(field) {
  const key = `leads.form.give.${field}`;
  return t(key) === key ? t("leads.form.give_value") : t(key);
}

// An API message on a field, in words: an empty value is "Give the <field>", a known message its sentence.
export function fieldText(message, field) {
  if (!message) return "";
  const known = API_MESSAGES.find(([pattern]) => pattern.test(message));
  if (!known) return t("leads.form.check");
  return known[1] ? t(`leads.form.api.${known[1]}`) : giveText(field);
}

// The required fields of a form left empty, each with its sentence: { key: "Give the key" }; {} = nothing missing.
export function missingFields(form, fields) {
  return Object.fromEntries(fields.filter((field) => blank(form[field])).map((field) => [field, giveText(field)]));
}

// The errors of a refused request on the form's `fields`, each in words ({ key: "Already in use — pick another" });
// {} = none on those fields.
export function apiFieldErrors(err, fields) {
  const form = useFormErrors();
  form.handleApiError(err);
  return Object.fromEntries(fields.filter((field) => form.errors[field]).map((field) => [field, fieldText(form.errors[field].msg, field)]));
}
