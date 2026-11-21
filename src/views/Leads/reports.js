import { t } from "@/i18n";

// A mean time as the report reads it: hours under a day, days with one decimal below 10, whole days above; "—" unknown.
export function durationLabel(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const hours = seconds / 3600;
  if (hours < 24) return t("leads.reports.hours", { n: Math.round(hours) });
  const days = hours / 24;
  return t("leads.reports.days", { n: days < 10 ? Math.round(days * 10) / 10 : Math.round(days) });
}

// The funnel: the companies that entered a stage as a share of those that entered the first one ("40 %"); "—" when
// the first stage had none in the period.
export function reachedLabel(entered, first) {
  if (!first) return "—";
  return `${Math.round((entered / first) * 100)} %`;
}
