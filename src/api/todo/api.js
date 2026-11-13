import { leadsApi } from "@/api/leads/client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";
import { channelTimeZone } from "@/utils/leadsTime";

// django-todo admin API v2 (Leads CRM plan 15): tasks of the Leads channel. The same JWT client as leads; the
// module is optional (`isModuleInstalled("todo")`). Due filters read the channel's local day (`tz`).
const base = () => `/api/todo/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;
const tz = () => channelTimeZone.value || Intl.DateTimeFormat().resolvedOptions().timeZone;

export const GET_Today = () => leadsApi.get(`${base()}/today/`, { params: { tz: tz() } });

export const GET_Tasks = (params) => leadsApi.get(`${base()}/tasks/`, { params: { tz: tz(), ...params } });

export const POST_Task = (body) => leadsApi.post(`${base()}/tasks/`, body);

export const PATCH_Task = (id, body) => leadsApi.patch(`${base()}/tasks/${id}/`, body);

export const POST_TaskDone = (id, outcome = "") => leadsApi.post(`${base()}/tasks/${id}/done/`, { outcome });

export const POST_TaskCancel = (id, reason = "") => leadsApi.post(`${base()}/tasks/${id}/cancel/`, { reason });

export const POST_TaskReopen = (id) => leadsApi.post(`${base()}/tasks/${id}/reopen/`, {});
