// A thread's subject: its first outbound mail, else its first entry (a thread that starts with a reply).
export function threadSubject(timeline = []) {
  return (timeline.find((entry) => entry.direction === "out") || timeline[0])?.subject || "";
}

// Messages waiting for the send beat that belong to one thread.
export function waitingOf(waiting, threadId) {
  return waiting.filter((message) => message.thread?.id === threadId);
}
