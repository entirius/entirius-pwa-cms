// The send beat runs on every 5-minute boundary; once the first beat after the slot has run (plus a grace
// for the beat itself) a mail still waiting is held by the send policy (window or daily cap).
const SEND_BEAT_MS = 5 * 60 * 1000;
const BEAT_GRACE_MS = 60 * 1000;

export function isOverdue(iso, now = Date.now()) {
  if (!iso) return false;
  const firstBeat = Math.ceil(new Date(iso).getTime() / SEND_BEAT_MS) * SEND_BEAT_MS;
  return now > firstBeat + BEAT_GRACE_MS;
}

// "HH:MM" in the browser's time zone; empty for a missing timestamp.
export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Day, month and "HH:MM" — an older thread's last activity; empty for a missing timestamp.
export function formatDateTime(iso) {
  if (!iso) return "";
  const options = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false };
  return new Date(iso).toLocaleString([], options);
}
