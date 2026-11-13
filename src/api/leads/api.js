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

// Leads CRM plan 15 (leads >= 0.5.0) — custom fields, scoring, owner, compose, funnel.
export const GET_Attributes = (entity) => leadsApi.get(`${base()}/attributes/`, { params: { entity } });

export const POST_Attribute = (body) => leadsApi.post(`${base()}/attributes/`, body);

export const PATCH_Attribute = (id, body) => leadsApi.patch(`${base()}/attributes/${id}/`, body);

export const DELETE_Attribute = (id) => leadsApi.delete(`${base()}/attributes/${id}/`);

// Facts a condition may name: built-ins and `attr.<key>`, each { name, kind, label, options }.
export const GET_Fields = () => leadsApi.get(`${base()}/fields/`);

export const GET_ScoringProfiles = () => leadsApi.get(`${base()}/scoring-profiles/`);

export const POST_ScoringProfile = (body) => leadsApi.post(`${base()}/scoring-profiles/`, body);

export const PATCH_ScoringProfile = (id, body) => leadsApi.patch(`${base()}/scoring-profiles/${id}/`, body);

// 409 NO_SCORING_PROFILE without an active profile.
export const POST_Score = (id) => leadsApi.post(`${base()}/companies/${id}/score/`, {});

export const POST_AssignOwner = (companyIds, ownerId) =>
  leadsApi.post(`${base()}/companies/assign/`, { company_ids: companyIds, owner_id: ownerId });

// 409 not_eligible / no_legal_basis / communicator_channel_missing.
export const POST_Compose = (id, body) => leadsApi.post(`${base()}/companies/${id}/compose/`, body);

export const GET_Funnel = (params) => leadsApi.get(`${base()}/reports/funnel/`, { params });

export const POST_Rule = (body) => leadsApi.post(`${base()}/rules/`, body);

export const PATCH_Rule = (id, body) => leadsApi.patch(`${base()}/rules/${id}/`, body);

export const DELETE_Rule = (id) => leadsApi.delete(`${base()}/rules/${id}/`);

export const GET_RuleRuns = (rule) => leadsApi.get(`${base()}/rule-runs/`, { params: { rule } });

// Leads CRM plan 16 (leads >= 0.5.0) — deals: stages of the sales pipeline, deals, the board, moves and history.
// Amounts travel as decimal strings, the currency as an ISO 4217 code.
export const GET_DealStages = () => leadsApi.get(`${base()}/deal-stages/`);

export const POST_DealStage = (body) => leadsApi.post(`${base()}/deal-stages/`, body);

export const PATCH_DealStage = (id, body) => leadsApi.patch(`${base()}/deal-stages/${id}/`, body);

// 409 while the stage holds deals.
export const DELETE_DealStage = (id) => leadsApi.delete(`${base()}/deal-stages/${id}/`);

export const GET_Deals = (params) => leadsApi.get(`${base()}/deals/`, { params });

// One column per stage in pipeline order: { stage, count, totals: [{ currency, one_off, recurring }], deals (first 25) }.
export const GET_DealBoard = (params) => leadsApi.get(`${base()}/deals/board/`, { params });

export const POST_Deal = (body) => leadsApi.post(`${base()}/deals/`, body);

export const GET_Deal = (id) => leadsApi.get(`${base()}/deals/${id}/`);

export const PATCH_Deal = (id, body) => leadsApi.patch(`${base()}/deals/${id}/`, body);

// 409 for a won or lost deal.
export const DELETE_Deal = (id) => leadsApi.delete(`${base()}/deals/${id}/`);

// `lost_reason` is required by a lost stage; "" is not sent.
export const POST_DealTransition = (id, stageKey, lostReason = "") =>
  leadsApi.post(`${base()}/deals/${id}/transition/`, { stage_key: stageKey, ...(lostReason ? { lost_reason: lostReason } : {}) });

export const GET_DealActivities = (id) => leadsApi.get(`${base()}/deals/${id}/activities/`, { params: { page_size: 100 } });

export const GET_CompanyDeals = (id) => leadsApi.get(`${base()}/companies/${id}/deals/`, { params: { page_size: 100 } });

// Channel settings (`leads.settings`): `default_currency` pre-fills a new deal.
export const GET_LeadsChannel = () => leadsApi.get(`${base()}/channel/`);
