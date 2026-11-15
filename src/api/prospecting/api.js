import { leadsApi } from "@/api/leads/client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// Prospecting admin API v2 (U3, the prospecting app of django-leads): people searches and candidates of the Leads channel, the companies
// placeholder. The same JWT client as leads; the module is optional (`isModuleEnabled("prospecting")`).
const base = () => `/api/prospecting/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;

export const GET_Candidates = (params) => leadsApi.get(`${base()}/people/candidates/`, { params });

export const POST_CandidateAccept = (id, email = "") =>
  leadsApi.post(`${base()}/people/candidates/${id}/accept/`, { email });

export const POST_CandidateReject = (id, reason = "") =>
  leadsApi.post(`${base()}/people/candidates/${id}/reject/`, { reason });

export const GET_Searches = (params) => leadsApi.get(`${base()}/people/searches/`, { params });

export const POST_Search = (body) => leadsApi.post(`${base()}/people/searches/`, body);

export const GET_Limits = () => leadsApi.get(`${base()}/people/limits/`);

export const GET_ProspectCompanies = () => leadsApi.get(`${base()}/companies/`);
