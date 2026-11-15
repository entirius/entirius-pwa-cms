import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const leads = vi.hoisted(() => ({
  GET_Companies: vi.fn(),
  GET_Stages: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  GET_LeadTypes: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  GET_Attributes: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  GET_Funnel: vi.fn(() => Promise.resolve({ data: { origins: [] } })),
  GET_AssignableUsers: vi.fn(() => Promise.resolve([])),
  POST_AssignOwner: vi.fn(),
  POST_CompanyPotential: vi.fn(),
  DELETE_CompanyPotential: vi.fn(),
}));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleAtLeast: () => true }) }));
const route = vi.hoisted(() => ({ name: "LeadsCompanies", query: {} }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => route, useRouter: () => router }));

import CompanyList from "@/views/Leads/CompanyList.vue";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const company = (id, extra = {}) => ({
  id, name: `Shop ${id}`, domain: `shop${id}.test`, stage: { key: "new", label: "New", kind: "open" }, owner: null, attributes: {},
  potential: "", potential_reason: "", potential_return_on: null, potential_manual: false, potential_comment: "", ...extra,
});
const mounted = async () => {
  const wrapper = mountOutbound(CompanyList, { area: "leads.companies", stubs: crmStubs });
  await flushPromises();
  return wrapper;
};

// U2: the potential dot on the company list — the dot, the legend, the filter, the dialog from a dot.
describe("Leads → Companies → potential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    route.query = {};
    leads.GET_Companies.mockResolvedValue({
      data: { count: 2, results: [company(1, { potential: "red", potential_reason: "silence", potential_return_on: "2027-01-10" }), company(2)] },
    });
  });

  it("shows a dot per written-to company, the three-line legend and the Potential filter", async () => {
    const wrapper = await mounted();
    const dots = wrapper.findAll('[data-testid="potential-dot"]');
    expect(dots.map((dot) => dot.attributes("data-potential"))).toEqual(["red", "none"]);
    expect(dots[0].attributes("title")).toMatch(/^No reply to the last mail · back /);
    expect(wrapper.findAll('[data-testid="potential-legend"] li')).toHaveLength(3);
    const filter = wrapper.findComponent('[data-testid="companies-filter-potential"]');
    expect(filter.props("options").map((option) => option.value)).toEqual(["green", "orange", "red", "none"]);
    setControl(wrapper, "companies-filter-potential", "orange");
    expect(router.replace).toHaveBeenLastCalledWith({ query: { potential: "orange" } });
  });

  it("the filter goes to the API", async () => {
    route.query = { owner: "all", potential: "none" };
    await mounted();
    expect(leads.GET_Companies).toHaveBeenCalledWith(expect.objectContaining({ potential: "none" }));
  });

  it("a click on a dot opens the dialog and a save updates the row", async () => {
    leads.POST_CompanyPotential.mockResolvedValue({ data: company(1, { potential: "green", potential_reason: "manual", potential_manual: true, potential_comment: "Fair" }) });
    const wrapper = await mounted();
    await wrapper.findAll('[data-testid="potential-dot"]')[0].trigger("click");
    await flushPromises();
    expect(router.push).not.toHaveBeenCalled();
    setControl(wrapper, "potential-comment", "Fair");
    setControl(wrapper, "potential-colour", "green");
    await flushPromises();
    await byTestid(wrapper, "potential-save").trigger("click");
    await flushPromises();
    expect(leads.POST_CompanyPotential).toHaveBeenCalledWith(1, { colour: "green", comment: "Fair" });
    expect(wrapper.findAll('[data-testid="potential-dot"]')[0].attributes("data-potential")).toBe("green");
    expect(wrapper.find('[data-testid="potential-star"]').exists()).toBe(true);
  });

  it("an older leads without the field shows no dot, legend or filter", async () => {
    leads.GET_Companies.mockResolvedValue({ data: { count: 1, results: [{ id: 3, name: "Old", domain: "old.test", stage: { key: "new", label: "New" }, attributes: {} }] } });
    const wrapper = await mounted();
    expect(wrapper.find('[data-testid="potential-dot"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="potential-legend"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-testid="companies-filter-potential"]').exists()).toBe(false);
  });
});
