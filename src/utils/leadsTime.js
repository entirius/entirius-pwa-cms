// "HH:MM" in the browser's time zone; empty for a missing timestamp.
export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
