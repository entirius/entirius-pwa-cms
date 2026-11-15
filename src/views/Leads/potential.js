import { t } from "@/i18n";
import { formatDay } from "@/utils/format";

// The potential dot of a company (leads `potential_service`, U2): green "going on", orange "in progress", red "come
// back later", "" = not written to yet (no dot). A leads without the feature sends no `potential` field.
export const POTENTIAL_COLOURS = ["green", "orange", "red"];
export const POTENTIAL_FILTERS = [...POTENTIAL_COLOURS, "none"];
// The task leads opens when a company comes back (Today: "Come back to <company>").
export const POTENTIAL_TASK_SOURCE = "leads.potential.came_back";

export const potentialOn = (company) => Boolean(company) && "potential" in company;

// The reason as a sentence: "Reply: Not now · back 15.02.2027"; a manual colour says the salesperson's comment.
export function potentialReason(company) {
  if (!company?.potential) return t("leads.potential.none");
  const reason = company.potential_reason || "";
  let text;
  if (company.potential_manual) text = t("leads.potential.manual", { comment: company.potential_comment });
  else if (reason.startsWith("reply:")) text = t("leads.potential.reason.reply_class", { class: t(`leads.reply_type.${reason.slice(6)}`) });
  else text = t(`leads.potential.reason.${reason || "reply"}`);
  return company.potential_return_on ? `${text} · ${t("leads.potential.back_on", { day: formatDay(company.potential_return_on) })}` : text;
}

export const potentialLabel = (colour) => t(`leads.potential.colour.${colour || "none"}`);

// A task row of Today: the come-back task reads in the user's language.
export const taskTitle = (task) => (task.source === POTENTIAL_TASK_SOURCE ? t("leads.potential.come_back_task", { name: task.subject_label }) : task.title);
