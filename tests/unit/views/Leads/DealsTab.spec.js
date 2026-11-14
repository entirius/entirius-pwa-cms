import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({ GET_CompanyDeals: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRouter: () => ({ push: vi.fn() }) }));

import DealsTab from "@/views/Leads/tabs/DealsTab.vue";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const deal = (id, kind) => ({ id, title: `Deal ${id}`, stage: { key: kind, label: kind, kind }, value_one_off: "10.00", currency: "PLN" });
const company = { id: 3, name: "Acme", contacts: [], deals: { open: 1, won: 0, lost: 1 } };
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(DealsTab, { area: "leads.companies", props: { company }, stubs: { ...crmStubs, DealDialog: true }, ...options });
  await flushPromises();
  return wrapper;
};

// Plan 16: company card → Deals — the open deals first, chips with the card's counts, Open deal with the company.
describe("Leads → company card → Deals", () => {
  beforeEach(() => leads.GET_CompanyDeals.mockResolvedValue({ data: { results: [deal(1, "open"), deal(2, "lost")] } }));

  it("lists the open deals; the Lost chip switches to the lost ones", async () => {
    const wrapper = await mounted();
    expect(leads.GET_CompanyDeals).toHaveBeenCalledWith(3);
    expect(wrapper.findAll('[data-testid="deal-row"]').map((row) => row.attributes("data-deal"))).toEqual(["1"]);
    expect(wrapper.findComponent('[data-testid="company-deals-chip-lost"]').props("count")).toBe(1);
    await byTestid(wrapper, "company-deals-chip-lost").trigger("click");
    expect(wrapper.findAll('[data-testid="deal-row"]').map((row) => row.attributes("data-deal"))).toEqual(["2"]);
  });

  // k4 (walk 4): an empty chip names what the other chips hold
  it("an empty chip says what the other chips hold", async () => {
    leads.GET_CompanyDeals.mockResolvedValue({ data: { results: [deal(2, "lost")] } });
    const wrapper = await mounted({ props: { company: { ...company, deals: { open: 0, won: 0, lost: 1 } } } });
    expect(wrapper.html()).toContain("No deals under Open — Lost: 1");
  });

  it("an archived deal is not listed", async () => {
    leads.GET_CompanyDeals.mockResolvedValue({ data: { results: [deal(1, "open"), { ...deal(2, "lost"), archived_at: "2026-11-14T10:00:00Z" }] } });
    const wrapper = await mounted();
    await byTestid(wrapper, "company-deals-chip-lost").trigger("click");
    expect(wrapper.findAll('[data-testid="deal-row"]')).toHaveLength(0);
  });

  it("Open deal hands the company to the dialog", async () => {
    const wrapper = await mounted();
    await byTestid(wrapper, "company-open-deal").trigger("click");
    const dialog = wrapper.findComponent({ name: "DealDialog" });
    expect(dialog.props("open")).toBe(true);
    expect(dialog.props("company")).toEqual(company);
  });
});
