// Maps an opaque `subject_ref` ("<app>.<Model>:<id>") to a CMS route; unknown prefixes → null.
const ROUTES = {
  // A notification is about the conversation: the company card opens on its timeline tab (desktop).
  "leads.Company": (id) => ({ name: "LeadsThread", params: { id: Number(id) }, query: { tab: "timeline" } }),
  // A paused mailbox or a broken login: the mailbox form.
  "communicator.Mailbox": (id) => ({ name: "LeadsMailboxEdit", params: { id: Number(id) } }),
};

export function routeForSubjectRef(subjectRef) {
  const match = /^([\w.]+):(\d+)$/.exec(subjectRef || "");
  if (!match) return null;
  const build = ROUTES[match[1]];
  return build ? build(match[2]) : null;
}

export function companyIdFromSubjectRef(subjectRef) {
  const route = routeForSubjectRef(subjectRef);
  return route?.name === "LeadsThread" ? route.params.id : null;
}

// The ref of a company as todo and notifications store it (the reverse of the `leads.Company` route).
export const companySubjectRef = (id) => `leads.Company:${id}`;

// A task's `contact_ref` ("leads.Contact:<id>") both ways; another ref → null.
export const contactSubjectRef = (id) => (id ? `leads.Contact:${id}` : "");

export function contactIdFromRef(ref) {
  const match = /^leads\.Contact:(\d+)$/.exec(ref || "");
  return match ? Number(match[1]) : null;
}
