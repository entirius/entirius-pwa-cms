// Maps an opaque `subject_ref` ("<app>.<Model>:<id>") to a CMS route; unknown prefixes → null.
const ROUTES = {
  "leads.Company": (id) => ({ name: "LeadsThread", params: { id: Number(id) } }),
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
