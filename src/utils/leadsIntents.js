// The reply intent classes (communicator T4) — one list for the settings screens, the timeline and the Inbox.
export const REPLY_INTENTS = ["interested", "not_now", "not_interested", "out_of_office", "wrong_person", "unsubscribe", "unclear"];

export const INTENT_TONES = {
  interested: "positive",
  not_now: "info",
  not_interested: "neutral",
  out_of_office: "neutral",
  wrong_person: "warning",
  unsubscribe: "negative",
  unclear: "warning",
};

// The latest classified reply of each thread: `replies` come newest first from `replies/`.
export function intentByThread(replies = []) {
  const map = new Map();
  for (const reply of replies) if (reply.intent && !map.has(reply.thread_id)) map.set(reply.thread_id, reply);
  return map;
}

// The reply of a timeline entry: replies and timeline entries share `received_at` / `at`.
export const replyAt = (replies = [], at) => replies.find((reply) => reply.received_at === at) || null;

// Reply-action row (strings from the form) -> PUT body, or { error } with an i18n key. Empty reminder/threshold = null.
export function actionBody(row) {
  const remind = row.remind_after_days === "" || row.remind_after_days === null ? null : Number(row.remind_after_days);
  if (remind !== null && (!Number.isInteger(remind) || remind < 0)) return { error: "communicator.reply_actions.remind_invalid" };
  const confidence = row.min_confidence === "" || row.min_confidence === null ? null : Number(row.min_confidence);
  if (confidence !== null && (Number.isNaN(confidence) || confidence < 0 || confidence > 1)) return { error: "communicator.reply_actions.confidence_invalid" };
  const body = { sequence: row.sequence, notify: row.notify, remind_after_days: remind, needs_review: row.needs_review, min_confidence: confidence };
  if (row.intent === "unsubscribe") body.auto_suppress = row.auto_suppress;
  return { body };
}
