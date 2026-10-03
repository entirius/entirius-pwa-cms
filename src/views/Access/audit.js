// Audit log (django-access): the README's actions, the list query and the gate-bypass grouping. A superuser's write
// through the gate leaves one `gate.bypass` row per request — numerous, so by default they fold into one row per
// actor and day.

export const AUDIT_ACTIONS = [
  "role.create",
  "role.update",
  "role.delete",
  "grant.create",
  "grant.delete",
  "grant.migrate",
  "application.create",
  "application.update",
  "token.create",
  "token.rotate",
  "token.revoke",
  "token.expiry",
  "legacy.import",
  "legacy.purge",
  "gate.bypass",
];
export const BYPASS = "gate.bypass";
export const AUDIT_PAGE_SIZE = 50;

// "2026-10-02" (the date picker's value) → that local day's start, or with `endOfDay` its last millisecond, as ISO.
function dayBound(value, endOfDay) {
  const [year, month, day] = value.split("-").map(Number);
  if (!endOfDay) return new Date(year, month - 1, day).toISOString();
  return new Date(new Date(year, month - 1, day + 1).getTime() - 1).toISOString();
}

export function auditParams({ page = 1, action, actor, from, to }) {
  const params = { page, page_size: AUDIT_PAGE_SIZE };
  if (action) params.action = action;
  if (actor) params.actor = actor;
  if (from) params.from = dayBound(from, false);
  if (to) params.to = dayBound(to, true);
  return params;
}

const localDay = (iso) => new Date(iso).toLocaleDateString("sv-SE");
const bypassKey = (entry) => `${entry.actor_id ?? entry.actor_label}|${localDay(entry.created_at)}`;

// Bypass rows of one actor and day become one row at the place of the newest (`grouped` = the entries); its detail
// lists the requests. A lone bypass stays as it is.
export function groupBypass(entries) {
  const groups = new Map();
  const rows = [];
  for (const entry of entries) {
    if (entry.action !== BYPASS) {
      rows.push(entry);
      continue;
    }
    const key = bypassKey(entry);
    if (!groups.has(key)) {
      groups.set(key, { ...entry, id: `bypass-${key}`, grouped: [], detail: { requests: [] } });
      rows.push(groups.get(key));
    }
    groups.get(key).grouped.push(entry);
    groups.get(key).detail.requests.push(entry.detail);
  }
  return rows.map((row) => (row.grouped?.length === 1 ? row.grouped[0] : row));
}
