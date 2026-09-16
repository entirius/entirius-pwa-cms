import { ref } from "vue";

// The send beat runs on every 5-minute boundary; once the first beat after the slot has run (plus a grace
// for the beat itself) a mail still waiting is held by the send policy (window or daily cap).
const SEND_BEAT_MS = 5 * 60 * 1000;
const BEAT_GRACE_MS = 60 * 1000;

export function isOverdue(iso, now = Date.now()) {
  if (!iso) return false;
  const firstBeat = Math.ceil(new Date(iso).getTime() / SEND_BEAT_MS) * SEND_BEAT_MS;
  return now > firstBeat + BEAT_GRACE_MS;
}

// The channel's send policy (send settings), read by the Leads layout and by the waiting table.
export const channelTimeZone = ref(undefined); // unset = the browser's
export const capReached = ref(false);

// The backend's slots ignore the daily cap, so only the policy tells a waiting mail nothing leaves today.
export function applyPolicy(policy) {
  channelTimeZone.value = policy?.timezone || undefined;
  capReached.value = Boolean(policy) && policy.sent_today >= policy.daily_cap;
}

// What a waiting mail may honestly say about its departure. `slot` is the backend's `next_slot` — the earliest
// moment its policy allows. Only a slot in the future is a promise; a slot that is now or past means the window
// is open and the mail waits for the send run, so the screens show a state and never a clock that slides forward.
export function sendState(slot, now = Date.now()) {
  if (!slot) return { state: "held" };
  if (new Date(slot).getTime() - now > BEAT_GRACE_MS) return { state: "at", time: formatTime(slot, new Date(now)) };
  return capReached.value ? { state: "cap" } : { state: "due" };
}

const dayKey = (date, timeZone) => date.toLocaleDateString("en-CA", { timeZone }); // "2026-09-15"

// One format for every Leads/notification timestamp: 24 h "HH:MM" in the channel time zone, with "DD.MM" in
// front when the day is not today there; empty for a missing timestamp.
export function formatTime(iso, now = new Date()) {
  if (!iso) return "";
  const timeZone = channelTimeZone.value;
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const day = dayKey(date, timeZone);
  return day === dayKey(now, timeZone) ? time : `${day.slice(8, 10)}.${day.slice(5, 7)} ${time}`;
}
