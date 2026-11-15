import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { t } from "@/i18n";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";

const api = vi.hoisted(() => ({
  GET_Candidates: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  POST_CandidateAccept: vi.fn(),
  POST_CandidateReject: vi.fn(),
}));
vi.mock("@/api/prospecting/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
const route = vi.hoisted(() => ({ name: "LeadsProspectingPeople", params: {}, query: {} }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("vue-router", async () => {
  const { reactive } = await import("vue");
  const live = reactive(route);
  return { useRoute: () => live, useRouter: () => router, createRouter: vi.fn(), createWebHistory: vi.fn() };
});

import Prospecting from "@/views/Leads/Prospecting.vue";
import { AREAS } from "@/configs/areas";
import { panels } from "@/configs/access";
import { leadsFrame } from "./leadsFrame";

async function mountPage(name) {
  route.name = name;
  const wrapper = mount(Prospecting, { global: { mocks: { $t: t }, components: leadsFrame.components, stubs: leadsFrame.stubs } });
  await flushPromises();
  return wrapper;
}

describe("Prospecting page (U3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("People lists waiting candidates of every company", async () => {
    const wrapper = await mountPage("LeadsProspectingPeople");
    expect(wrapper.find('[data-testid="prospecting-people"]').exists()).toBe(true);
    expect(api.GET_Candidates).toHaveBeenCalledWith({ subject_ref: undefined, status: "pending" });
  });

  it("has no Companies tab: finding companies is not built", async () => {
    const wrapper = await mountPage("LeadsProspectingPeople");
    expect(wrapper.find('[data-testid="prospecting-tabs"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="prospecting-companies-placeholder"]').exists()).toBe(false);
  });

  it("the areas belong to the Leads panel and are named in both languages", () => {
    const leads = panels.find((panel) => panel.idx === "leads");
    expect(leads.areas).toEqual(expect.arrayContaining([AREAS.PROSPECTING_PEOPLE, AREAS.PROSPECTING_COMPANIES]));
    for (const locale of [en, pl]) {
      expect(locale.access.areas.prospecting.people).toBeTruthy();
      expect(locale.access.areas.prospecting.companies).toBeTruthy();
      expect(locale.nav.leads_prospecting).toBeTruthy();
      expect(locale.leads.company.tabs.people).toBeTruthy();
    }
    const keys = (obj, prefix = "") =>
      Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(pl.leads.prospecting)).toEqual(keys(en.leads.prospecting));
  });
});
