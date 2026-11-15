import { leadsApi } from "@/api/leads/client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// Prospecting admin API v2 (U3, the prospecting app of django-leads): people searches and candidates of the Leads channel. The same JWT client as leads; the module is optional (`isModuleEnabled("prospecting")`).
const base = () => `/api/prospecting/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;

export const GET_Candidates = (params) => leadsApi.get(`${base()}/people/candidates/`, { params });

export const POST_CandidateAccept = (id, email = "") =>
  leadsApi.post(`${base()}/people/candidates/${id}/accept/`, { email });

export const POST_CandidateReject = (id, reason = "") =>
  leadsApi.post(`${base()}/people/candidates/${id}/reject/`, { reason });

export const GET_Searches = (params) => leadsApi.get(`${base()}/people/searches/`, { params });

// The company is the one of the Leads channel the `subject_ref` names (a 400 on `subject_ref`: not a company of the channel, or no domain).
export const POST_Search = (subjectRef) => leadsApi.post(`${base()}/people/searches/`, { subject_ref: subjectRef });

export const GET_Limits = () => leadsApi.get(`${base()}/people/limits/`);

