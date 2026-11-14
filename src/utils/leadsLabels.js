import { t } from "@/i18n";
import { formatLeadsDay } from "@/utils/leadsTime";

// No raw enum value or backend status reaches the screen: each one has an i18n label, the raw value is the fallback.
const label = (key, fallback) => (t(key) === key ? fallback : t(key));

export const legalBasisLabel = (value) => label(`leads.legal_basis.${value}`, value);

export const stageKindLabel = (value) => label(`leads.stage_kind.${value}`, value);

// The word beside a list row's on/off switch follows the switch (never a fixed "Active" beside a switch that is off).
export const activeLabel = (on) => t(on ? "leads.common.switch_on" : "leads.common.switch_off");

export const statusLabel = (value) => label(`leads.status.${value}`, value);

export const templateKindLabel = (value) => label(`communicator.template.kinds.${value}`, value);

export const suppressionKindLabel = (value) => label(`communicator.suppressions.kinds.${value}`, value);

export const replyTypeLabel = (value) => label(`leads.reply_type.${value}`, value);

export const mailboxStateLabel = (value) => label(`leads.mailbox_state.${value}`, value);

export const dncSourceLabel = (value) => label(`leads.dnc.source.${value}`, value);

export const dncKindLabel = (value) => label(`leads.dnc.kind.${value}`, value);

export const addressStatusLabel = (value) => label(`leads.address_status.${value}`, value);

export const importStatusLabel = (value) => label(`leads.import.state.${value}`, value);

// An import report reason ("invalid_email", "too_long:name"): a sentence naming the column, the code as the fallback.
export function importReasonLabel(reason) {
  const [code, name = ""] = String(reason).split(":");
  const key = `leads.import.reason.${code}`;
  return t(key) === key ? String(reason) : t(key, { name });
}

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
  [/^draft review_required$/, () => t("leads.activity.draft_review")],
  [/^draft (\w+)$/, ([status]) => t("leads.activity.draft", { status: statusLabel(status).toLowerCase() })],
  [/^stage (\S+) -> (\S+)$/, ([from, to]) => t("leads.activity.stage", { from: humanize(from), to: humanize(to) })],
  [/^legal basis (None|) -> (\S+)$/, ([, to]) => t("leads.activity.legal_basis_set", { to: basisLabel(to) })],
  [/^legal basis (\S+) -> (\S+)$/, ([from, to]) => t("leads.activity.legal_basis_changed", { from: basisLabel(from), to: basisLabel(to) })],
  [/^blocked: (\w+)$/, ([reason]) => t("leads.activity.blocked", { reason: blockReasonLabel(reason) })],
  [/^deal opened: (.+)$/, ([title]) => t("leads.history.event_deal_opened", { title })],
  [/^deal deleted: (.+)$/, ([title]) => t("leads.history.event_deal_deleted", { title })],
];

const stageName = (label, key) => label || capitalize(humanize(key || ""));
const withDetail = (text, detail) => (detail ? `${text} — ${detail}` : text);
const detailOf = (d) => d.outcome || d.reason || "";

// Each known `data.event` of an activity (plan 21) is built from the panel's own translations; the stored English
// `message` is only the fallback of a line without a known event.
const EVENT_SENTENCES = {
  reply: (d) => (d.class ? t("leads.history.event_reply", { type: replyTypeLabel(d.class) }) : t("leads.history.event_reply_plain")),
  composed: () => t("leads.history.event_composed"),
  sequence_stopped: () => t("leads.history.event_sequence_stopped"),
  sequence_paused: (d) =>
    d.resume_at ? t("leads.history.event_sequence_paused_until", { date: formatLeadsDay(d.resume_at) }) : t("leads.history.event_sequence_paused"),
  task_created: (d) => t("leads.history.event_task_added", { title: d.title }),
  task_done: (d) => withDetail(t("leads.history.event_task_done", { title: d.title }), detailOf(d)),
  task_cancelled: (d) => withDetail(t("leads.history.event_task_cancelled", { title: d.title }), detailOf(d)),
  task_reopened: (d) => t("leads.history.event_task_reopened", { title: d.title }),
  deal_opened: (d) => t("leads.history.event_deal_opened", { title: d.title }),
  deal_moved: (d) =>
    t("leads.history.event_deal_moved", { title: d.title, from: stageName(d.from_label, d.from_stage), to: stageName(d.to_label, d.to_stage) }),
  deal_won: (d) => t("leads.history.event_deal_won", { title: d.title }),
  deal_lost: (d) => withDetail(t("leads.history.event_deal_lost", { title: d.title }), d.reason),
  deal_reopened: (d) => t("leads.history.event_deal_reopened", { title: d.title }),
  deal_deleted: (d) => t("leads.history.event_deal_deleted", { title: d.title }),
  owner_set: (d) => t("leads.history.event_owner", { name: d.owner_name }),
  owner_cleared: () => t("leads.history.event_owner_cleared"),
};

const stageLine = (d) => t("leads.activity.stage", { from: stageName(d.from_label, d.from), to: stageName(d.to_label, d.to) });

// An activity (or just its stored message) as one line: by `data.event`, else a stage move with the channel's stage
// labels, else the message through the known shapes.
export function activityText(activity) {
  const { message = "", data = {}, kind } = typeof activity === "string" ? { message: activity } : activity || {};
  if (EVENT_SENTENCES[data.event]) return EVENT_SENTENCES[data.event](data);
  if (kind === "stage" && (data.from || data.from_label)) return stageLine(data);
  return messageText(message);
}

function messageText(message) {
  if (!message) return "";
  for (const [shape, sentence] of ACTIVITY_SHAPES) {
    const match = shape.exec(message);
    if (match) return sentence(match.slice(1));
  }
  return capitalize(humanize(message).replace(/ -> /g, " → "));
}

// Status words as badges: the same tone for a message everywhere it shows (bubble, list row, header).
const MESSAGE_TONES = { sent: "positive", scheduled: "info", approved: "info", failed: "negative", review_required: "warning", skipped: "neutral", rejected: "neutral", suppressed: "negative" };
export const messageTone = (status) => MESSAGE_TONES[status] || "neutral";
const THREAD_TONES = { open: "info", replied: "accent", closed: "neutral" };
export const threadTone = (status) => THREAD_TONES[status] || "neutral";

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
  [/^message \d+ review_required$/, () => t("leads.rules.run.draft_review")],
  [/^message \d+ (\w+)$/, ([status]) => t("leads.rules.run.draft", { status: statusLabel(status).toLowerCase() })],
  [/^score (S\d) \((\d+) points\)$/, ([segment, points]) => t("leads.rules.run.score", { segment, points })],
];

export function ruleRunText(run, fieldLabel = (field) => field) {
  const outcome = label(`leads.rules.outcome.${run.outcome || "running"}`, humanize(run.outcome));
  const shape = RULE_RUN_SHAPES.find(([pattern]) => pattern.test(run.detail || ""));
  if (!shape) return outcome;
  return `${outcome} — ${shape[1](run.detail.match(shape[0]).slice(1), fieldLabel)}`;
}
