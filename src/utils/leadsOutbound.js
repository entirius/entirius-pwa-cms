// Q11 helpers: sender routes, the approval inbox, address status. Pure functions (the views stay thin, tests are cheap).

export const ROUTE_KEY = /^[a-z0-9_-]{1,64}$/;

// The error code of an API refusal (`{ error: "ROUTE_EXISTS", ... }`), "" when there is none.
export const errorCode = (err) => (err?.response?.data || err)?.error || "";

export const blankRoute = () => ({
  key: "",
  name: "",
  from_email: "",
  cc_email: "",
  is_active: true,
  daily_cap: "",
  warmup_start_cap: "",
  warmup_step: 5,
  warmup_started_on: "",
});

export const routeToForm = (route) => ({
  key: route.key,
  name: route.name || "",
  from_email: route.from_email || "",
  cc_email: route.cc_email || "",
  is_active: route.is_active,
  daily_cap: route.daily_cap ?? "",
  warmup_start_cap: route.warmup_start_cap ?? "",
  warmup_step: route.warmup_step ?? 5,
  warmup_started_on: route.warmup_started_on || "",
});

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const count = (value) => (value === "" || value == null ? null : Number(value));
const validCount = (n) => n === null || (Number.isInteger(n) && n >= 0 && n <= 10000);

// Form (strings) -> request body, or { error } with an i18n key. `create` adds the key. The API replaces every field
// on PUT, so the body always carries all of them; an empty number is null, a warm-up needs the daily limit as ceiling.
export function buildRouteBody(form, { create = false } = {}) {
  if (create && !ROUTE_KEY.test(form.key)) return { error: "communicator.routes.key_invalid" };
  if (!EMAIL.test(form.from_email.trim())) return { error: "communicator.routes.from_invalid" };
  if (form.cc_email.trim() && !EMAIL.test(form.cc_email.trim())) return { error: "communicator.routes.cc_invalid" };
  const daily = count(form.daily_cap);
  const start = count(form.warmup_start_cap);
  if (!validCount(daily) || !validCount(start)) return { error: "communicator.routes.number_invalid" };
  const step = Number(form.warmup_step);
  if (!Number.isInteger(step) || step < 0 || step > 10000) return { error: "communicator.routes.number_invalid" };
  if (start !== null && daily === null) return { error: "communicator.routes.warmup_needs_cap" };
  if (start !== null && start > daily) return { error: "communicator.routes.warmup_above_cap" };
  const body = {
    name: form.name.trim(),
    from_email: form.from_email.trim(),
    cc_email: form.cc_email.trim(),
    is_active: form.is_active,
    daily_cap: daily,
    warmup_start_cap: start,
    warmup_step: step,
    warmup_started_on: start === null ? null : form.warmup_started_on || null,
  };
  return create ? { key: form.key, ...body } : body;
}

// "12 / 50" today, "12" without a limit, and whether a warm-up is shaping the limit.
export function capText(route) {
  return route.cap_today == null ? String(route.sent_today) : `${route.sent_today} / ${route.cap_today}`;
}

// The route of the key ("" = the channel's own From) for a select that offers "channel default" first.
export function routeOptions(routes, { defaultLabel, defaultKey = "" }) {
  const named = routes.map((route) => ({ value: route.key, label: route.name ? `${route.name} (${route.key})` : route.key }));
  const label = defaultKey ? `${defaultLabel}: ${defaultKey}` : defaultLabel;
  return [{ value: "", label }, ...named];
}

// ---- approvals

export const AGE_FILTERS = [
  { value: "", hours: null },
  { value: "1", hours: 1 },
  { value: "24", hours: 24 },
  { value: "72", hours: 72 },
];

// 0.4 -> "<1 h", 5.2 -> "5 h", 30 -> "1 d 6 h", 72 -> "3 d". Short, because it sits in a narrow column.
export function ageText(hours) {
  const h = Math.floor(Number(hours) || 0);
  if (h < 1) return "<1 h";
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${days} d ${rest} h` : `${days} d`;
}

export const hasBlocker = (row) => Boolean(row.blocker);

// Rows of the selection split into those the server would accept and those with a blocker. Approve sends only the
// first group; reject sends all (a blocked draft can still be thrown away).
export function splitSelection(rows, selected) {
  const picked = rows.filter((row) => selected.has(row.id));
  return { all: picked.map((row) => row.id), approvable: picked.filter((row) => !hasBlocker(row)).map((row) => row.id), blocked: picked.filter(hasBlocker) };
}

// `failed` is { "<id>": "reason" } -> [{ id, reason }].
export const failedList = (failed) => Object.entries(failed || {}).map(([id, reason]) => ({ id: Number(id), reason: String(reason) }));

// Keyboard on the approval list. Returns the action name or null; typing in a field never triggers one.
export function approvalKey(event) {
  const tag = event.target?.tagName;
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || event.target?.isContentEditable) return null;
  // Enter and Space on a focused button or link belong to that control
  if (["BUTTON", "A"].includes(tag) && (event.key === "Enter" || event.key === " ")) return null;
  switch (event.key) {
    case "j":
    case "ArrowDown":
      return "next";
    case "k":
    case "ArrowUp":
      return "prev";
    case "x":
    case " ":
      return "toggle";
    case "Enter":
      return "preview";
    case "a":
      return "approve";
    case "r":
      return "reject";
    default:
      return null;
  }
}

// ---- address status

export const EMAIL_STATUS_TONES = { valid: "positive", risky: "warning", invalid: "negative", unknown: "neutral" };
export const EMAIL_STATUSES = ["valid", "risky", "invalid", "unknown"];

// The host of an address ("anna@Shop.PL" -> "shop.pl"), "" for something that is not one.
export const domainOf = (email) => (String(email || "").includes("@") ? String(email).split("@").pop().trim().toLowerCase() : "");
