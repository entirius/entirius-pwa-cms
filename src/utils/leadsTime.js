import { ref } from "vue";

// A slot this close to now is the send run's to take — no clock is promised for it.
const SEND_RUN_GRACE_MS = 60 * 1000;

// The channel's send policy (send settings), read by the Leads layout and by the waiting table.
export const channelTimeZone = ref(undefined); // unset = the browser's
export const capReached = ref(false);
export const sendWindows = ref([]); // [{ start: "08:00", end: "17:00" }] in the channel time zone

const hhmm = (value) => String(value).slice(0, 5);

// The backend's slots ignore the daily cap, so only the policy tells a waiting mail nothing leaves today.
export function applyPolicy(policy) {
  channelTimeZone.value = policy?.timezone || undefined;
  capReached.value = Boolean(policy) && policy.sent_today >= policy.daily_cap;
  sendWindows.value = (policy?.windows || []).map((w) => ({ start: hhmm(w.start_time), end: hhmm(w.end_time) }));
}

const localHhmm = (now) =>
  new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: channelTimeZone.value });

// Without known windows nothing claims the window is closed.
function windowOpen(now) {
  if (!sendWindows.value.length) return true;
  const time = localHhmm(now);
  return sendWindows.value.some(({ start, end }) => start <= time && time < end);
}

const windowHours = () => sendWindows.value.map(({ start, end }) => `${start}–${end}`).join(", ");

// A cap reached today makes a slot of today no promise; a slot on a later channel day still is.
function slotAfterToday(slot, now) {
  if (!slot) return "";
  const later = dayKey(new Date(slot), channelTimeZone.value) !== dayKey(new Date(now), channelTimeZone.value);
  return later ? formatTime(slot, new Date(now)) : "";
}

// What a waiting mail may honestly say about its departure — the one helper every screen uses. `slot` is the
// backend's `next_slot`, which ignores the daily cap: a used-up cap wins over any slot, a closed window names its
// hours, and only a future slot inside an open window is a clock; a slot that is now or past is due. A held mail
// carries the slot it waits for as `next`.
export function sendState(slot, now = Date.now()) {
  if (capReached.value) return { state: "cap", next: slotAfterToday(slot, now) };
  if (!slot || !windowOpen(now)) return { state: "held", window: windowHours(), next: slot ? formatTime(slot, new Date(now)) : "" };
  if (new Date(slot).getTime() - now > SEND_RUN_GRACE_MS) return { state: "at", time: formatTime(slot, new Date(now)) };
  return { state: "due" };
}

const dayKey = (date, timeZone) => date.toLocaleDateString("en-CA", { timeZone }); // "2026-09-15"

// One format for every Leads/notification timestamp: 24 h "HH:MM" in the channel time zone, with "DD.MM" in
// front when the day is not today there; empty for a missing timestamp.
// Lists that compare days (the board) always carry "DD.MM HH:MM", so today and another day read alike.
export function formatDayTime(iso) {
  return iso ? formatTime(iso, new Date(0)) : "";
}

export function formatTime(iso, now = new Date()) {
  if (!iso) return "";
  const timeZone = channelTimeZone.value;
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const day = dayKey(date, timeZone);
  return day === dayKey(now, timeZone) ? time : `${day.slice(8, 10)}.${day.slice(5, 7)} ${time}`;
}
