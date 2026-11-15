import { t } from "@/i18n";
import { activityActor, activityKindLabel, activityText, replyTypeLabel } from "@/utils/leadsLabels";

// History (U11): one activity of the channel as a journal row — who, what, on what, why.
// The kinds the person filter offers, in the order of the leads timeline.
export const HISTORY_KINDS = [
  "task", "deal", "stage", "note", "draft", "sent", "reply", "bounce", "optout", "blocked", "skipped", "rule",
  "rotation", "legal_basis", "score", "intel", "import", "form", "anonymised", "settings",
];

export const kindLabel = (kind) => activityKindLabel(kind);

// The kinds whose reason a person typed (a cancelled task, a lost deal, a skipped draft): shown as typed.
const TYPED_REASON_KINDS = new Set(["task", "deal", "skipped", "rule"]);
const has = (key) => t(key) !== key;

// A coded reason ("reply:not_now", "manual", "wrong_person") as words: the potential dot's labels when the CMS has
// them, else the journal's own; a code without a label stays as it is.
export function reasonLabel(activity) {
  const data = activity.data || {};
  const reason = data.reason || data.outcome || data.lost_reason || "";
  if (!reason || TYPED_REASON_KINDS.has(activity.kind)) return reason;
  if (reason === "manual" && data.comment && has("leads.potential.manual")) return t("leads.potential.manual", { comment: data.comment });
  if (reason.startsWith("reply:")) return t("leads.journal.reason.reply_class", { class: replyTypeLabel(reason.slice(6)) });
  const key = [`leads.potential.reason.${reason}`, `leads.journal.reason.${reason}`].find(has);
  return key ? t(key) : reason;
}

// The reason sits in its own column, so the sentence leaves it out.
export function historyRow(activity) {
  const data = activity.data || {};
  const what = activity.kind || activity.message ? activityText({ ...activity, data: { ...data, reason: undefined, outcome: undefined } }) : "";
  const on = activity.company_id
    ? [activity.company_name, activity.deal_title].filter(Boolean).join(" · ")
    : t("leads.journal.channel");
  return { id: activity.id, who: activityActor(activity.actor), what, on, reason: reasonLabel(activity), companyId: activity.company_id || null };
}
