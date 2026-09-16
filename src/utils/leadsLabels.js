import { t } from "@/i18n";

// No raw enum value or backend status reaches the screen: each one has an i18n label, the raw value is the fallback.
const label = (key, fallback) => (t(key) === key ? fallback : t(key));

export const companyTypeLabel = (value) => label(`leads.company_type.${value}`, value);

export const legalBasisLabel = (value) => label(`leads.legal_basis.${value}`, value);

export const stageKindLabel = (value) => label(`leads.stage_kind.${value}`, value);

export const statusLabel = (value) => label(`leads.status.${value}`, value);

// One wording for a waiting mail's departure: Review, the Inbox summary and the waiting table say the same.
export const sendStateLabel = ({ state, time }) => t(`leads.send_state.${state}`, { time });

// Activity messages are written by the service ("draft review_required"); the status word is the only raw part.
export function activityText(message) {
  const draft = /^draft (\w+)$/.exec(message || "");
  return draft ? t("leads.activity.draft", { status: statusLabel(draft[1]) }) : message;
}
