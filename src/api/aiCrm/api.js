import { leadsApi } from "@/api/leads/client";
import { getLang } from "@/i18n";
import { useLeadsChannelStore } from "@/stores/leadsChannel";
import { channelTimeZone } from "@/utils/leadsTime";

// AI CRM admin API v2 (U10, the ai_crm app of django-leads): the AI CRM agent of the Leads channel — the day plan, the chat and the tools.
// The module is optional (`isModuleEnabled("ai_crm")`); the same JWT client as leads. Every call from the CMS is
// `source: "cms"`, so each change it makes is recorded as "<user> via ai-crm (cms)".
const base = () =>
  `/api/ai-crm/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;
const tz = () =>
  channelTimeZone.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
const language = () => (getLang() === "PL" ? "pl" : "en");

export const GET_AiCrmPlan = () =>
  leadsApi.get(`${base()}/plan/`, {
    params: { tz: tz(), language: language() },
  });

export const POST_AiCrmChat = (message, history = []) =>
  leadsApi.post(`${base()}/chat/`, {
    message,
    history,
    source: "cms",
    language: language(),
  });

export const POST_AiCrmTool = (name, args = {}) =>
  leadsApi.post(`${base()}/tools/${name}/`, {
    arguments: args,
    source: "cms",
    language: language(),
  });

export const GET_AiCrmProposals = () => leadsApi.get(`${base()}/proposals/`);
