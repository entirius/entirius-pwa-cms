// Scoring profile helpers (T3): the editor works on plain strings, the API takes typed values.
export const SCORE_FIELDS = ["lead_type", "industry", "platform", "domain", "hooks_count", "emails_count", "rotation_count"];
export const SCORE_OPS = ["eq", "in", "contains", "gte", "lte"];
const COUNT_FIELDS = ["hooks_count", "emails_count", "rotation_count"];

export const SEGMENT_TONES = { S1: "positive", S2: "info", S3: "warning", S4: "neutral" };

export const blankCondition = () => ({ field: "lead_type", op: "in", value: "", label: "", points: 10 });

// A count compared with eq/gte/lte is a whole number; `in` is a comma separated list; the rest is text.
export function parseValue(field, op, text) {
  const raw = String(text ?? "").trim();
  if (op === "in") return raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (COUNT_FIELDS.includes(field) || op === "gte" || op === "lte") return raw === "" || Number.isNaN(Number(raw)) ? NaN : Number(raw);
  return raw;
}

export const formatValue = (value) => (Array.isArray(value) ? value.join(", ") : String(value ?? ""));

const emptyValue = (value) => value === "" || (Array.isArray(value) && !value.length) || (typeof value === "number" && Number.isNaN(value));

// Editor rows (strings) -> request body, or { error } with an i18n key.
export function buildProfileBody(form) {
  const { S, M, L } = Object.fromEntries(["S", "M", "L"].map((key) => [key, Number(form.thresholds[key])]));
  if ([S, M, L].some((n) => !Number.isInteger(n) || n < 0 || n > 1000)) return { error: "leads.scoring.thresholds_invalid" };
  if (!(S <= M && M <= L)) return { error: "leads.scoring.thresholds_order" };
  const convert = (row, withPoints) => {
    const value = parseValue(row.field, row.op, row.value);
    const item = { field: row.field, op: row.op, value, label: String(row.label || "").trim() };
    if (withPoints) item.points = Number(row.points);
    return emptyValue(value) || (withPoints && !Number.isInteger(item.points)) ? null : item;
  };
  const rules = form.rules.map((row) => convert(row, true));
  const disqualifiers = form.disqualifiers.map((row) => convert(row, false));
  if ([...rules, ...disqualifiers].includes(null)) return { error: "leads.scoring.row_invalid" };
  return { body: { key: form.key.trim() || undefined, thresholds: { S, M, L }, rules, disqualifiers, is_active: form.is_active } };
}

// A saved row back to the editor.
export const toRow = (item) => ({ field: item.field, op: item.op, value: formatValue(item.value), label: item.label || "", points: item.points ?? 0 });

// "1d 4h" / "3h 20m" / "12m" from seconds; empty for null.
export function formatSeconds(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const total = Math.round(Number(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
