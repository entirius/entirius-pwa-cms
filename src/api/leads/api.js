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
export const POST_Import = (file) => {
  const form = new FormData();
  form.append("file", file);
  return leadsApi.post(`${base()}/imports/`, form);
};

export const GET_Import = (id) => leadsApi.get(`${base()}/imports/${id}/`);

export const GET_Stages = () => leadsApi.get(`${base()}/stages/`);

export const POST_Stage = (body) => leadsApi.post(`${base()}/stages/`, body);

export const PATCH_Stage = (id, body) => leadsApi.patch(`${base()}/stages/${id}/`, body);

export const DELETE_Stage = (id) => leadsApi.delete(`${base()}/stages/${id}/`);

export const GET_Rules = () => leadsApi.get(`${base()}/rules/`);
