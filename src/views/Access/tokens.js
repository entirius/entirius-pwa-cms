// Application tokens (django-access): the rules the token dialogs share. A token is publishable (reaches browsers) or
// secret (server-to-server); one token never holds both groups. A secret token must expire, at most 365 days ahead
// (D21) — legacy keys excepted: they never expire by themselves and take any future date or none (D28). A picked date
// means the start of that day in the browser's time zone (the `access_token expire --at` rule), so tomorrow is the
// earliest. The server checks all of it again; its 400 issue codes read as the same field errors.

export const SECRET_MAX_DAYS = 365;
const DAY_MS = 86400000;
export const EXPIRY_ISSUES = ["EXPIRY_REQUIRED", "EXPIRY_TOO_LONG", "EXPIRY_IN_PAST"];
export const PUBLISHABLE = "publishable";
export const SECRET = "secret";

// "ent_api_Ab3d…x9Q2": how a token is recognised, never by its value.
export const tokenKey = (token) => (token.last_four ? `${token.prefix}…${token.last_four}` : token.prefix);

// An unknown scope counts as secret: the stricter rules apply.
export function scopeGroup(key, scopes) {
  return scopes.find((scope) => scope.key === key)?.publishable ? PUBLISHABLE : SECRET;
}

export const isSecret = (keys, scopes) => keys.some((key) => scopeGroup(key, scopes) === SECRET);
export const isPublishable = (keys, scopes) => keys.some((key) => scopeGroup(key, scopes) === PUBLISHABLE);

// The group a selection rules out (its checkboxes are disabled), or null while nothing is ticked.
export function blockedGroup(keys, scopes) {
  if (!keys.length) return null;
  return isSecret(keys, scopes) ? PUBLISHABLE : SECRET;
}

const pad = (n) => String(n).padStart(2, "0");
export const dateString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function dayFromToday(days, now) {
  return dateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

export const minExpiryDate = (now = new Date()) => dayFromToday(1, now);
// The local day of the instant 365 days ahead: its midnight never passes the server's `now + 365 days`, a DST change in
// between included.
export const maxExpiryDate = (now = new Date()) => dateString(new Date(now.getTime() + SECRET_MAX_DAYS * DAY_MS));

// "2027-10-03" → the ISO instant of that day's local start; empty → null (no expiry).
export function expiryInstant(date) {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

// The client-side check of an expiry field: null when fine, else the issue code the server would answer.
export function expiryIssue({ date, required, capped }, now = new Date()) {
  if (!date) return required ? "EXPIRY_REQUIRED" : null;
  if (date < minExpiryDate(now)) return "EXPIRY_IN_PAST";
  if (capped && date > maxExpiryDate(now)) return "EXPIRY_TOO_LONG";
  return null;
}

// The issue code of the server's expiry refusal (`details[].field === "expires_at"`) when it is one of ours, else null
// (the field then shows the server's own text).
export function refusedExpiryIssue(err) {
  const body = err?.response?.data ?? err;
  const detail = (Array.isArray(body?.details) ? body.details : []).find((d) => d?.field === "expires_at");
  return EXPIRY_ISSUES.includes(detail?.issue) ? detail.issue : null;
}

// The local date of an ISO expiry, for a dialog that edits it.
export const isoToDate = (iso) => (iso ? dateString(new Date(iso)) : "");

// "in 364 days" / "3 days ago" in the UI language.
export function relativeDays(iso, lang, now = new Date()) {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / DAY_MS);
  return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(days, "day");
}
