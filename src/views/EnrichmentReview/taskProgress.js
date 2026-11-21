// Task progress: the counts a worker keeps on the task (`proposed`, `failed`, anything else it adds).
// proposed and failed first, a picture check's `checked` and its verdicts next, then how it was judged (stored result,
// prefilter); any other count follows in its own order.
const ORDER = ["proposed", "failed", "checked", "set", "review", "pass", "escalate", "propose_picture", "cached", "prefiltered"];
const LAST_RANK = ORDER.length;

/** [[key, value]] in the ORDER above, the counts it does not name after them in their own order. */
export function orderedCounts(counts) {
  const entries = Object.entries(counts || {});
  const rank = ([key]) => (ORDER.includes(key) ? ORDER.indexOf(key) : LAST_RANK);
  return entries.sort((a, b) => rank(a) - rank(b));
}

/** A running or queued task refreshes the list; any open one too when the list shows that single task (just
 * created). */
export function needsRefresh(tasks, single = false) {
  const moving = (task) => task.status === "in_progress" || Number.isInteger(task.queued_ahead);
  return tasks.some((task) => moving(task) || (single && task.status === "open"));
}

const STATUS_TONE = { open: "info", in_progress: "warning", done: "positive", cancelled: "neutral", failed: "negative" };

/** The StatusBadge tone of a task status. */
export function taskStatusTone(status) {
  return STATUS_TONE[status] || "neutral";
}

const DRAWER_STATUSES = ["open", "in_progress", "failed"];

/** A run still going or failed opens its queue drawer (its products, why it failed); a finished one shows what it
 * proposed in place. */
export const opensDrawer = (task) => DRAWER_STATUSES.includes(task?.status);
