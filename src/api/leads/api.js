import { leadsApi } from "./client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// django-leads admin API v2 — company card and its activities (plan 13).
const base = () => `/api/leads/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;

export const GET_Company = (id) => leadsApi.get(`${base()}/companies/${id}/`);

export const GET_CompanyActivities = (id, params = {}) =>
  leadsApi.get(`${base()}/activities/`, { params: { company: id, ...params } });

// Plan 14 — board, company card, import, stages.
export const GET_Companies = (params) => leadsApi.get(`${base()}/companies/`, { params });

export const POST_Transition = (id, stage_key) =>
  leadsApi.post(`${base()}/companies/${id}/transition/`, { stage_key });

export const PATCH_Company = (id, body) => leadsApi.patch(`${base()}/companies/${id}/`, body);

export const POST_Communicate = (id, { template_key, contact_id }) =>
  leadsApi.post(`${base()}/companies/${id}/communicate/`, { template_key, contact_id });

export const POST_RequestAudit = (id) => leadsApi.post(`${base()}/companies/${id}/request-audit/`, {});

export const POST_CreateCustomer = (id) => leadsApi.post(`${base()}/companies/${id}/create-customer/`, {});

// FormData without a Content-Type: axios sets the multipart boundary.
// Q11: `senderRoute` = "the whole file goes through this route" (omitted = the channel default decides).
export const POST_Import = (file, senderRoute = "") => {
  const form = new FormData();
  form.append("file", file);
  if (senderRoute) form.append("sender_route", senderRoute);
  return leadsApi.post(`${base()}/imports/`, form);
};

export const GET_Import = (id) => leadsApi.get(`${base()}/imports/${id}/`);

export const GET_Stages = () => leadsApi.get(`${base()}/stages/`);

export const POST_Stage = (body) => leadsApi.post(`${base()}/stages/`, body);

export const PATCH_Stage = (id, body) => leadsApi.patch(`${base()}/stages/${id}/`, body);

export const DELETE_Stage = (id) => leadsApi.delete(`${base()}/stages/${id}/`);

export const GET_Rules = () => leadsApi.get(`${base()}/rules/`);

// UX-006 — one lead by hand: the company, then its contact (the same two creates the API offers; no CSV).
export const POST_Company = (body) => leadsApi.post(`${base()}/companies/`, body);

export const POST_Contact = (body) => leadsApi.post(`${base()}/contacts/`, body);

// UX-011 — contacts managed in the company card. DELETE: 204 = deleted (never used), 200 = anonymised (used).
export const PATCH_Contact = (id, body) => leadsApi.patch(`${base()}/contacts/${id}/`, body);

export const DELETE_Contact = (id) => leadsApi.delete(`${base()}/contacts/${id}/`);

export const GET_LeadTypes = () => leadsApi.get(`${base()}/lead-types/`);

// UX-004 — lead types of the channel (Leads → Settings); the code is fixed after create.
export const POST_LeadType = (body) => leadsApi.post(`${base()}/lead-types/`, body);

export const PATCH_LeadType = (id, body) => leadsApi.patch(`${base()}/lead-types/${id}/`, body);

export const DELETE_LeadType = (id) => leadsApi.delete(`${base()}/lead-types/${id}/`);

// S5 — rules, analysis profiles and recipient-pick profiles of the channel (Leads → Settings). Lists never carry the
// prompt: a profile's detail does.
export const POST_Rule = (body) => leadsApi.post(`${base()}/rules/`, body);

export const PATCH_Rule = (id, body) => leadsApi.patch(`${base()}/rules/${id}/`, body);

export const DELETE_Rule = (id) => leadsApi.delete(`${base()}/rules/${id}/`);

// kind: "analysis-profiles" | "recipient-profiles"
export const GET_Profiles = (kind) => leadsApi.get(`${base()}/${kind}/`);

export const GET_Profile = (kind, id) => leadsApi.get(`${base()}/${kind}/${id}/`);

export const POST_Profile = (kind, body) => leadsApi.post(`${base()}/${kind}/`, body);

export const PATCH_Profile = (kind, id, body) => leadsApi.patch(`${base()}/${kind}/${id}/`, body);

export const DELETE_Profile = (kind, id) => leadsApi.delete(`${base()}/${kind}/${id}/`);

// Q2 — scoring (T3), pilot (T3) and the funnel report, reply routes (T4). Backend: django-leads feat/outbound-automation.
export const GET_ScoringProfiles = () => leadsApi.get(`${base()}/scoring-profiles/`);

export const POST_ScoringProfile = (body) => leadsApi.post(`${base()}/scoring-profiles/`, body);

export const PATCH_ScoringProfile = (id, body) => leadsApi.patch(`${base()}/scoring-profiles/${id}/`, body);

export const DELETE_ScoringProfile = (id) => leadsApi.delete(`${base()}/scoring-profiles/${id}/`);

// Runs the active profile now and writes Activity `score`; 409 NO_SCORING_PROFILE when the channel has none.
export const POST_Score = (id) => leadsApi.post(`${base()}/companies/${id}/score/`, {});

export const GET_Pilots = (params) => leadsApi.get(`${base()}/pilots/`, { params });

export const POST_Pilot = (body) => leadsApi.post(`${base()}/pilots/`, body);

export const PATCH_Pilot = (id, body) => leadsApi.patch(`${base()}/pilots/${id}/`, body);

export const DELETE_Pilot = (id) => leadsApi.delete(`${base()}/pilots/${id}/`);

export const GET_PilotReport = () => leadsApi.get(`${base()}/pilots/report/`);

// origin: omit = any origin, "" = companies without an origin.
export const GET_FunnelReport = (params) => leadsApi.get(`${base()}/reports/funnel/`, { params });

export const GET_ReplyRoutes = () => leadsApi.get(`${base()}/reply-routes/`);

export const PUT_ReplyRoute = (intent, body) => leadsApi.put(`${base()}/reply-routes/${intent}/`, body);

export const DELETE_ReplyRoute = (intent) => leadsApi.delete(`${base()}/reply-routes/${intent}/`);

// Q11 — sender routes in leads (default of the channel, bulk change), address verification and compliance.
// Backend: django-leads feat/outbound-verification-compliance.
export const GET_LeadsSettings = () => leadsApi.get(`${base()}/settings/`);

export const PATCH_LeadsSettings = (body) => leadsApi.patch(`${base()}/settings/`, body);

export const POST_BulkSenderRoute = (company_ids, sender_route) =>
  leadsApi.post(`${base()}/companies/bulk-sender-route/`, { company_ids, sender_route });

// params: { email_status: "invalid" | "risky" | ..., page, page_size }
export const GET_Contacts = (params) => leadsApi.get(`${base()}/contacts/`, { params });

export const POST_VerifyContact = (id) => leadsApi.post(`${base()}/contacts/${id}/verify/`, {});

export const GET_VerificationReport = () => leadsApi.get(`${base()}/reports/verification/`);

export const GET_SendCheck = (id) => leadsApi.get(`${base()}/contacts/${id}/send-check/`);

export const GET_DoNotContact = () => leadsApi.get(`${base()}/do-not-contact/`);

// body: { email } or { domain }, plus `reason`. There is no way back on purpose (no DELETE).
export const POST_DoNotContact = (body) => leadsApi.post(`${base()}/do-not-contact/`, body);
