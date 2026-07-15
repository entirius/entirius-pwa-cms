/**
 * Format a money amount to 2 decimal places + optional currency suffix.
 *
 * Backend stores DecimalField with 4 decimal places (e.g. "40.3000") — UI always
 * shows 2 ("40.30 PLN"). Convention matches PriceManager views (`num.toFixed(2)`).
 *
 * @param {string|number|null|undefined} amount - decimal-ish input
 * @param {string} [currency] - ISO 4217 code appended after a space
 * @returns {string} "" for null/empty/NaN, "40.30" or "40.30 PLN" otherwise
 */
export function formatCost(amount, currency = "") {
  if (amount === null || amount === undefined || amount === "") return ""
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (Number.isNaN(num)) return ""
  const formatted = num.toFixed(2)
  return currency ? `${formatted} ${currency}` : formatted
}

/**
 * Format an ISO datetime string into a compact locale-aware label.
 *
 * Default: short date + short time. Backend serializes datetimes as ISO 8601 with timezone
 * (e.g. "2026-05-18T19:06:46Z"). This produces locale output like "18/05/2026, 21:06"
 * (en-GB style) or "18.05.2026, 21:06" (pl) without seconds — fits narrow table cells.
 *
 * @param {string|null|undefined} iso
 * @param {object} [opts] - extra Intl.DateTimeFormat options to override defaults
 * @returns {string} "" for null/empty/invalid, locale-formatted string otherwise
 */
export function formatDate(iso, opts = {}) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const defaults = { dateStyle: "short", timeStyle: "short" }
  try {
    return new Intl.DateTimeFormat(undefined, { ...defaults, ...opts }).format(d)
  } catch {
    return d.toLocaleString()
  }
}
