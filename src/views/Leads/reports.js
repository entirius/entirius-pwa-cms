import { t } from "@/i18n";

// A mean time as the report reads it: hours under a day, days with one decimal below 10, whole days above; "—" unknown.
export function durationLabel(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const hours = seconds / 3600;
  if (hours < 24) return t("leads.reports.hours", { n: Math.round(hours) });
  const days = hours / 24;
  return t("leads.reports.days", { n: days < 10 ? Math.round(days * 10) / 10 : Math.round(days) });
}
