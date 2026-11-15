import { t } from "@/i18n";
import { activityKindLabel, activityText } from "@/utils/leadsLabels";

// History (U11): one activity of the channel as a journal row — who, what, on what, why.
// The kinds the person filter offers, in the order of the leads timeline.
export const HISTORY_KINDS = [
  "task", "deal", "stage", "note", "draft", "sent", "reply", "bounce", "optout", "blocked", "skipped", "rule",
  "rotation", "legal_basis", "score", "intel", "import", "form", "anonymised", "settings",
];

export const kindLabel = (kind) => activityKindLabel(kind);

// `system` and an import batch read as words; a person is their username.
export function actorLabel(actor = "") {
  if (!actor || actor === "system") return t("leads.journal.system");
  if (actor.startsWith("import:")) return t("leads.journal.import");
  return actor;
}

// The reason sits in its own column, so the sentence leaves it out.
export function historyRow(activity) {
  const data = activity.data || {};
  const reason = data.reason || data.outcome || data.lost_reason || "";
  const what = activity.kind || activity.message ? activityText({ ...activity, data: { ...data, reason: undefined, outcome: undefined } }) : "";
  const on = activity.company_id
    ? [activity.company_name, activity.deal_title].filter(Boolean).join(" · ")
    : t("leads.journal.channel");
  return { id: activity.id, who: actorLabel(activity.actor), what, on, reason, companyId: activity.company_id || null };
}
