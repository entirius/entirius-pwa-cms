import { t } from "@/i18n";

// The outbound screens of the Leads CRM (plan 14): approvals, mailboxes, sending health, reply types, automatic
// moves, do not contact. They need communicator / leads 0.5.0; an older backend keeps today's panel.
export const OUTBOUND_VERSION = "0.5.0";

export const outboundOn = (munin, module) => munin.isModuleAtLeast(module, OUTBOUND_VERSION);

// `?from=approvals` on a draft opened from Approvals: the Review keeps Approvals as its way back.
export const FROM_APPROVALS = "approvals";

// Reply types in the glossary order (`ux/copy.md`) and their StatusBadge tones.
export const REPLY_TYPES = ["interested", "not_now", "not_interested", "out_of_office", "wrong_person", "unsubscribe", "unclear"];

export const REPLY_TONES = {
  interested: "positive",
  not_now: "info",
  not_interested: "neutral",
  out_of_office: "neutral",
  wrong_person: "warning",
  unsubscribe: "negative",
  unclear: "warning",
};

export const replyTone = (type) => REPLY_TONES[type] || "neutral";

// The backend states (active, paused, needs_login, disabled) in the panel's words: "sending off" for a mailbox that
// does not send, "warming up" for an active one whose cap of today is still below its daily cap.
export const MAILBOX_TONES = {
  active: "positive",
  warming_up: "info",
  paused: "warning",
  needs_login: "negative",
  send_off: "neutral",
};

export function mailboxState(mailbox, capToday = null) {
  if (mailbox.state === "disabled" || (mailbox.state === "active" && mailbox.send_enabled === false)) return "send_off";
  if (mailbox.state !== "active") return mailbox.state;
  const warming = mailbox.warmup_started_on && capToday !== null && mailbox.daily_cap && capToday < mailbox.daily_cap;
  return warming ? "warming_up" : "active";
}

// The `blocker` of an approval row is the service's English detail; the known shapes get the panel's words.
const LEGAL_FOOTER = "the message requires a legal footer and has none";
const MAILBOX = /^the mailbox (\S+) cannot send \((\w+)\)$/;
// A recipient who may not be mailed (communicator's address check and the leads outreach gate): sentence → label key.
const RECIPIENT = {
  "the recipient opted out or is on the do-not-contact list": "suppressed",
  "the recipient's address is not valid": "address_invalid",
  "the company is marked do not contact": "do_not_contact",
  "the contact opted out": "opted_out",
  "the contact was anonymised": "anonymised",
  "the contact is flagged as the wrong person": "wrong_person",
  "the contact has no legal basis for mail": "no_legal_basis",
};

// Today's sending of a mailbox in words: "11 of 40 sent", or "11 sent, no cap" when the mailbox has no daily cap.
export const sentToday = (sent, cap) =>
  cap === null || cap === undefined ? t("leads.mailboxes.today_uncapped", { sent }) : t("leads.mailboxes.today_of", { sent, cap });

export function problemText(blocker) {
  if (blocker === LEGAL_FOOTER) return t("leads.problem.legal_footer");
  if (RECIPIENT[blocker]) return t(`leads.problem.recipient.${RECIPIENT[blocker]}`);
  const match = MAILBOX.exec(blocker || "");
  const state = match?.[2] === "disabled" ? "send_off" : match?.[2];
  if (match) return t("leads.problem.mailbox", { address: match[1], state: t(`leads.mailbox_state.${state}`) });
  return t("leads.problem.other", { detail: blocker });
}

// The machine code of a refused leads call (409 `not_eligible`, `no_scoring_profile` …) in lower case, wherever the
// v2 envelope carries it: `error`, `code` or the first detail's `code` / `issue`.
export function apiErrorCode(err) {
  const body = err?.response?.data || err || {};
  const detail = Array.isArray(body.details) ? body.details[0] : null;
  return String(detail?.code || detail?.issue || body.code || body.error || "").toLowerCase();
}

// Score segments and stage kinds as StatusBadge tones (`ux/copy.md`).
export const SEGMENT_TONES = { S1: "positive", S2: "accent", S3: "info", S4: "neutral" };

const STAGE_TONES = { open: "neutral", won: "positive", lost: "negative", unresponsive: "warning" };

export const stageTone = (stage) => STAGE_TONES[stage?.kind] || "neutral";
