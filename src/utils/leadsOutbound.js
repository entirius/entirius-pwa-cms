import { t } from "@/i18n";

// The outbound screens of the Leads CRM (plan 14): approvals, mailboxes, sending health, reply types, automatic
// moves, do not contact. They need communicator / leads 0.5.0; an older backend keeps today's panel.
export const OUTBOUND_VERSION = "0.5.0";

export const outboundOn = (munin, module) => munin.isModuleAtLeast(module, OUTBOUND_VERSION);

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

// The `blocker` of an approval row is the service's English detail; the two known shapes get the panel's words.
const LEGAL_FOOTER = "the message requires a legal footer and has none";
const MAILBOX = /^the mailbox (\S+) cannot send \((\w+)\)$/;

export function problemText(blocker) {
  if (blocker === LEGAL_FOOTER) return t("leads.problem.legal_footer");
  const match = MAILBOX.exec(blocker || "");
  const state = match?.[2] === "disabled" ? "send_off" : match?.[2];
  if (match) return t("leads.problem.mailbox", { address: match[1], state: t(`leads.mailbox_state.${state}`) });
  return t("leads.problem.other", { detail: blocker });
}
