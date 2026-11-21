import { GET_Replies } from "@/api/communicator/api";

// The reply a Write mail answers, from a timeline bubble: the timeline entry carries no reply id, so the thread's
// replies are asked and the one received at the bubble's moment is taken (the opt-out lookup does the same). The To
// contact is the company contact with the sender's address. An unknown reply throws — nothing is answered blindly.
export async function replyForCompose(threadId, entry, contacts = []) {
  const id = entry.replyId ?? (await findReplyId(threadId, entry.at));
  const sender = String(entry.from || "").toLowerCase();
  const contact = contacts.find((item) => item.email && item.email.toLowerCase() === sender);
  return { id, subject: entry.subject, body: entry.body, contact_id: contact?.id ?? null };
}

async function findReplyId(threadId, at) {
  const { data } = await GET_Replies({ thread: threadId, page_size: 100 });
  const found = (data.results || []).find((reply) => reply.received_at === at);
  if (!found) throw new Error("reply not found");
  return found.id;
}

// N3: one "Re:" whatever the case and count of the prefixes already there ("RE: re: Offer" → "Re: Offer").
export const replySubject = (subject) => (subject ? `Re: ${subject.replace(/^(\s*re\s*:\s*)+/i, "")}` : "");
