import { t } from "@/i18n";

// No raw enum value or backend status reaches the screen: each one has an i18n label, the raw value is the fallback.
const label = (key, fallback) => (t(key) === key ? fallback : t(key));

export const legalBasisLabel = (value) => label(`leads.legal_basis.${value}`, value);

export const stageKindLabel = (value) => label(`leads.stage_kind.${value}`, value);

export const statusLabel = (value) => label(`leads.status.${value}`, value);

export const templateKindLabel = (value) => label(`communicator.template.kinds.${value}`, value);

export const suppressionKindLabel = (value) => label(`communicator.suppressions.kinds.${value}`, value);

export const replyTypeLabel = (value) => label(`leads.reply_type.${value}`, value);

export const mailboxStateLabel = (value) => label(`leads.mailbox_state.${value}`, value);

export const dncSourceLabel = (value) => label(`leads.dnc.source.${value}`, value);

export const dncKindLabel = (value) => label(`leads.dnc.kind.${value}`, value);

export const addressStatusLabel = (value) => label(`leads.address_status.${value}`, value);

export const healthTriggerLabel = (value) => label(`leads.health.trigger.${value}`, value);

// One wording for a waiting mail's departure: Review, the Inbox summary, the waiting table and the thread say the same.
export const sendStateLabel = ({ state, time, window }) =>
  t(`leads.send_state.${window ? "held_window" : state}`, { time, window });

// The same state as one sentence with the slot a held mail waits for — the confirmation after Send and the Inbox.
export const sendStateSentence = (sendState) =>
  sendState.next ? t("leads.send_state.with_next", { state: sendStateLabel(sendState), time: sendState.next }) : sendStateLabel(sendState);

// A raw service word ("no_eligible_contact", "None") read as words: a label when there is one, else spaced out.
const humanize = (value) => String(value).replace(/_/g, " ");
export const blockReasonLabel = (value) => label(`leads.block_reason.${value}`, humanize(value));
const basisLabel = (value) => humanize(legalBasisLabel(value)).toLowerCase();
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Activity messages are written by the service ("stage new -> replied"): each known shape becomes a sentence built
// from labels; anything else keeps its words without snake_case or ASCII arrows. The raw value stays in the API.
const ACTIVITY_SHAPES = [
  [/^draft (\w+)$/, ([status]) => t("leads.activity.draft", { status: statusLabel(status) })],
  [/^stage (\S+) -> (\S+)$/, ([from, to]) => t("leads.activity.stage", { from: humanize(from), to: humanize(to) })],
  [/^legal basis (None|) -> (\S+)$/, ([, to]) => t("leads.activity.legal_basis_set", { to: basisLabel(to) })],
  [/^legal basis (\S+) -> (\S+)$/, ([from, to]) => t("leads.activity.legal_basis_changed", { from: basisLabel(from), to: basisLabel(to) })],
  [/^blocked: (\w+)$/, ([reason]) => t("leads.activity.blocked", { reason: blockReasonLabel(reason) })],
  [/^deal opened: (.+)$/, ([title]) => t("leads.history.event_deal_opened", { title })],
  [/^deal deleted: (.+)$/, ([title]) => t("leads.history.event_deal_deleted", { title })],
];

export function activityText(message) {
  if (!message) return "";
  for (const [shape, sentence] of ACTIVITY_SHAPES) {
    const match = shape.exec(message);
    if (match) return sentence(match.slice(1));
  }
  return capitalize(humanize(message).replace(/ -> /g, " → "));
}

// A rule run's detail as the service writes it ("skipped: no hooks", "message 60 review_required", "score S2 (40
// points)") read as words, without ids; `fieldLabel` names a condition's field. An unknown detail adds nothing.
const RULE_RUN_SHAPES = [
  [/^skipped: condition (\S+)$/, ([field], fieldLabel) => t("leads.rules.run.condition", { field: fieldLabel(field) })],
  [/^skipped: no hooks$/, () => t("leads.rules.run.no_hooks")],
  [/^skipped: no email$/, () => t("leads.rules.run.no_email")],
  [/^skipped: no scoring profile$/, () => t("leads.rules.run.no_scoring")],
  [/^skipped: AI toolbox disabled$/, () => t("leads.rules.run.no_toolbox")],
  [/^no draft$/, () => t("leads.rules.run.no_draft")],
  [/^rule cooldown$/, () => t("leads.rules.run.cooldown")],
  [/^audit requested$/, () => t("leads.rules.run.audit")],
  [/^blocked: (\w+)$/, ([reason]) => blockReasonLabel(reason)],
  [/^message \d+ (\w+)$/, ([status]) => t("leads.rules.run.draft", { status: statusLabel(status).toLowerCase() })],
  [/^score (S\d) \((\d+) points\)$/, ([segment, points]) => t("leads.rules.run.score", { segment, points })],
];

export function ruleRunText(run, fieldLabel = (field) => field) {
  const outcome = label(`leads.rules.outcome.${run.outcome || "running"}`, humanize(run.outcome));
  const shape = RULE_RUN_SHAPES.find(([pattern]) => pattern.test(run.detail || ""));
  if (!shape) return outcome;
  return `${outcome} — ${shape[1](run.detail.match(shape[0]).slice(1), fieldLabel)}`;
}
