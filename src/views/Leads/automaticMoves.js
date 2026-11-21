import { t } from "@/i18n";
import { REPLY_TYPES } from "@/utils/leadsOutbound";

// Automatic moves: one card per event of the leads stage map; a reply type also carries the communicator reply plan.
// The stage select encodes the two kinds of "no stage": NONE = no row (no move, or "same as any reply" for a type),
// KEEP = a row with a null target (a reply type that keeps the stage).
export const NONE = "__none";
export const KEEP = "__keep";

export const EVENTS = ["first_sent", "reply", ...REPLY_TYPES.map((type) => `reply:${type}`), "sequence_finished"];

export const typeOf = (event) => (event.startsWith("reply:") ? event.slice(6) : "");

export function eventTitle(event) {
  const type = typeOf(event);
  if (!type) return t(`leads.moves.event.${event}`);
  return t("leads.moves.event.reply_type", { type: t(`leads.reply_type.${type}`) });
}

export function targetOptions(event, stages) {
  const own = typeOf(event)
    ? [
        { value: NONE, label: t("leads.moves.same_as_reply") },
        { value: KEEP, label: t("leads.moves.keep_stage") },
      ]
    : [{ value: NONE, label: t("leads.moves.no_move") }];
  return [...own, ...stages.map((stage) => ({ value: stage.key, label: stage.label }))];
}

export function sequenceOptions(type) {
  const actions = type === "out_of_office" ? ["stop", "pause", "pause_until_return"] : ["stop", "pause"];
  return actions.map((value) => ({ value, label: t(`leads.moves.seq.${value}`) }));
}

export const alertOptions = () => ["high", "medium", "low"].map((value) => ({ value, label: t(`leads.moves.alert_level.${value}`) }));

// An API entry → the card's stage part.
export function stagePart(entry) {
  if (!entry?.configured) return { target: NONE, forward_only: entry?.forward_only ?? true };
  return { target: entry.target_stage_key ?? KEEP, forward_only: entry.forward_only };
}

// The stage request of a changed card: null = DELETE (no row), else the PUT body.
export const stageBody = ({ target, forward_only }) =>
  target === NONE ? null : { target_stage_key: target === KEEP ? null : target, forward_only };

export const planBody = ({ sequence, notify, needs_review }) => ({ sequence, notify, needs_review });

export const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
