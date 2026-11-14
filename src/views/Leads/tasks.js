import { t } from "@/i18n";
import { channelTimeZone, formatLeadsDay, formatTime } from "@/utils/leadsTime";
import { pluralKey } from "@/utils/plural";

// Tasks of the Leads CRM (django-todo): kinds, the relative due label of `ux/copy.md` on the channel's local day.
export const TASK_KINDS = ["todo", "mail", "phone", "linkedin", "meeting"];

export const kindOptions = () => TASK_KINDS.map((value) => ({ value, label: t(`leads.task_kind.${value}`) }));

const dayKey = (date) => date.toLocaleDateString("en-CA", { timeZone: channelTimeZone.value });
const dayNumber = (date) => Date.parse(dayKey(date)) / 86400000;

// { label, tone }: overdue (negative), today (info), later (neutral), no date (neutral).
export function taskDue(task, now = new Date()) {
  if (task.status === "done") {
    const label = task.done_at ? t("leads.due.done_on", { date: formatLeadsDay(task.done_at) }) : t("leads.today.chip_done");
    return { label, tone: "positive" };
  }
  if (!task.due_at) return { label: t("leads.due.none"), tone: "neutral" };
  const due = new Date(task.due_at);
  const days = dayNumber(due) - dayNumber(now);
  const time = formatTime(task.due_at, due);
  if (days < 0) return { label: t(`leads.due.overdue_${pluralKey(-days)}`, { count: -days }), tone: "negative" };
  if (days === 0) return { label: t("leads.due.today", { time }), tone: "info" };
  if (days === 1) return { label: t("leads.due.tomorrow", { time }), tone: "neutral" };
  return { label: t("leads.due.on", { date: formatLeadsDay(task.due_at) }), tone: "neutral" };
}

// The date picker's "YYYY-MM-DD HH:MM" (browser time) ↔ ISO; the default due is today 17:00.
export const pickerToIso = (value) => (value ? new Date(value.replace(" ", "T")).toISOString() : null);

const pad = (n) => String(n).padStart(2, "0");

export function isoToPicker(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const defaultDue = (now = new Date()) => `${isoToPicker(now.toISOString()).slice(0, 10)} 17:00`;
