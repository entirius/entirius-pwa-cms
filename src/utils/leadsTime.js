// The send beat runs every 5 minutes; a scheduled slot older than that is held by the send policy.
const SEND_BEAT_MS = 5 * 60 * 1000;

export function isOverdue(iso, now = Date.now()) {
  return Boolean(iso) && now - new Date(iso).getTime() > SEND_BEAT_MS;
}

// "HH:MM" in the browser's time zone; empty for a missing timestamp.
export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
