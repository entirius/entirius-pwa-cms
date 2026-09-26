import { t } from "@/i18n";

// One text source for the header panel and the in-view banner: `config_health.checks.<code>.<state>` (code dots →
// underscores); a code this CMS does not know yet falls back to the backend's English title.
export function checkKey(code) {
  return code.replace(/\./g, "_");
}

export function checkText(row) {
  const key = `config_health.checks.${checkKey(row.code)}.${row.state}`;
  const text = t(key, { scope: row.scope });
  return text === key ? row.title || row.code : text;
}

export function checkName(code) {
  const key = `config_health.names.${checkKey(code)}`;
  const text = t(key);
  return text === key ? code : text;
}

// `/…` is a CMS route, anything else an external page (module docs).
export function isInternalFix(url) {
  return typeof url === "string" && url.startsWith("/");
}
