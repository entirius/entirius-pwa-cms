import { leadsApi } from "./client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// django-leads admin API v2 — company card and its activities (plan 13).
const base = () => `/api/leads/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;

export const GET_Company = (id) => leadsApi.get(`${base()}/companies/${id}/`);

export const GET_CompanyActivities = (id, params = {}) =>
  leadsApi.get(`${base()}/activities/`, { params: { company: id, ...params } });
