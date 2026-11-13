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
// `runRules` (leads >= 0.5.0): new companies enter their first stage with its rules; undefined = not sent.
export const POST_Import = (file, runRules) => {
  const form = new FormData();
  form.append("file", file);
  if (runRules !== undefined) form.append("run_rules", String(runRules));
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

// Leads CRM plan 14 (leads >= 0.5.0) — event → stage map: first_sent, reply, reply:<type>, sequence_finished.
export const GET_StageEvents = () => leadsApi.get(`${base()}/stage-events/`);

export const PUT_StageEvent = (event, body) => leadsApi.put(`${base()}/stage-events/${event}/`, body);

export const DELETE_StageEvent = (event) => leadsApi.delete(`${base()}/stage-events/${event}/`);

// Why a contact gets no mail: { eligible, reasons } of the outreach gate.
export const GET_Mailable = (companyId, contactId) =>
  leadsApi.get(`${base()}/companies/${companyId}/contacts/${contactId}/mailable/`);

// Active staff who can own a company or a mailbox: [{ id, username, name }], at most 50 (leads >= 0.5.0).
export const GET_AssignableUsers = async (search = "") => {
  const { data } = await leadsApi.get(`${base()}/assignable-users/`, { params: { search } });
  return data.results ?? data;
};
