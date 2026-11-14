import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const leads = vi.hoisted(() => ({
  GET_Companies: vi.fn(),
  GET_Stages: vi.fn(() => Promise.resolve({ data: { results: [{ key: "new", label: "New" }] } })),
  GET_LeadTypes: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  GET_Attributes: vi.fn(() => Promise.resolve({ data: { results: [{ key: "platform", kind: "select", label: "Platform", order: 0, show_in_list: true, is_active: true, options: [{ value: "m2", label: "Magento" }] }] } })),
  GET_Funnel: vi.fn(() => Promise.resolve({ data: { origins: [{ origin: "fair", companies: 2 }] } })),
  GET_AssignableUsers: vi.fn(() => Promise.resolve([{ id: 7, username: "anna", name: "Anna" }])),
  POST_AssignOwner: vi.fn(() => Promise.resolve({ data: { updated: 2 } })),
}));
const crm = vi.hoisted(() => ({ on: true }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleAtLeast: () => crm.on }) }));
const route = vi.hoisted(() => ({ name: "LeadsCompanies", query: {} }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => route, useRouter: () => router }));

import CompanyList from "@/views/Leads/CompanyList.vue";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const company = (id, extra = {}) => ({ id, name: `Shop ${id}`, domain: `shop${id}.test`, stage: { key: "new", label: "New", kind: "open" }, owner: null, attributes: { platform: "m2" }, score_segment: "S2", score_points: 40, ...extra });
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(CompanyList, { area: "leads.companies", stubs: crmStubs, ...options });
  await flushPromises();
  return wrapper;
};

// Plan 15: Companies — the full list, its state in the URL.
describe("Leads → Companies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    crm.on = true;
    route.query = {};
    leads.GET_Companies.mockResolvedValue({ data: { count: 45, results: [company(1), company(2, { do_not_contact: true })] } });
  });

  it("asks one server page with Mine as the default owner and the newest activity first", async () => {
    const wrapper = await mounted();
    expect(byTestid(wrapper, "companies-owner-mine").attributes("data-active")).toBe("true");
    expect(leads.GET_Companies).toHaveBeenCalledWith({ owner: "me", sort: "-last_activity_at", page: 1, page_size: 20 });
    expect(wrapper.findAll('[data-testid="companies-item"]')).toHaveLength(2);
    expect(wrapper.findComponent({ name: "Pagination" }).props("pages")).toBe(3);
  });

  it("reads the filters from the URL and writes every change back to it", async () => {
    route.query = { owner: "all", stage: "new", "attr.platform": "m2", page: "2" };
    const wrapper = await mounted();
    expect(leads.GET_Companies).toHaveBeenCalledWith({ stage: "new", "attr.platform": "m2", page: 2, sort: "-last_activity_at", page_size: 20 });
    setControl(wrapper, "companies-filter-segment", "S1");
    expect(router.replace).toHaveBeenLastCalledWith({ query: { owner: "all", stage: "new", "attr.platform": "m2", segment: "S1" } });
    await byTestid(wrapper, "companies-owner-none").trigger("click");
    expect(router.replace.mock.lastCall[0].query.owner).toBe("none");
  });

  // P4 (walk 3): the Company type column names the type; a company without one reads "Unknown", muted, never clipped
  it("a company without a type reads Unknown, muted", async () => {
    leads.GET_Companies.mockResolvedValue({ data: { count: 1, results: [company(1, { lead_type: "UNKNOWN" })] } });
    const wrapper = await mounted();
    const table = wrapper.findComponent('[data-testid="companies-table"]');
    expect(table.props("rows")[0].lead_type).toBe("Unknown");
    expect(table.props("columns").find((column) => column.key === "lead_type")).toMatchObject({ width: "max-content", truncate: false });
  });

  it("sorts only by the allowlisted keys", async () => {
    const wrapper = await mounted();
    const table = wrapper.findComponent('[data-testid="companies-table"]');
    table.vm.$emit("sort", { key: "score", direction: "desc" });
    expect(router.replace.mock.lastCall[0].query.sort).toBe("-score_points");
    table.vm.$emit("sort", { key: "name", direction: "asc" });
    expect(router.replace.mock.lastCall[0].query.sort).toBeUndefined();
  });

  it("assigns the selected companies to an owner in bulk", async () => {
    const wrapper = await mounted();
    wrapper.findComponent('[data-testid="companies-table"]').vm.$emit("select", [company(1), company(2)]);
    await flushPromises();
    wrapper.findComponent('[data-testid="companies-bulk"]').vm.$emit("action", "assign", "7");
    await flushPromises();
    expect(leads.POST_AssignOwner).toHaveBeenCalledWith([1, 2], 7);
  });

  it("filters with no match offer Clear filters", async () => {
    route.query = { owner: "all", stage: "new" };
    leads.GET_Companies.mockResolvedValue({ data: { count: 0, results: [] } });
    const wrapper = await mounted();
    await byTestid(wrapper, "companies-clear-filters").trigger("click");
    expect(router.replace).toHaveBeenCalledWith({ query: { owner: "all" } });
  });

  it("read-only: no Add, no selection; an older backend: no owner chips", async () => {
    const readonly = await mounted({ write: false });
    expect(byTestid(readonly, "companies-add").exists()).toBe(false);
    expect(readonly.findComponent('[data-testid="companies-table"]').props("selectable")).toBe(false);
    crm.on = false;
    const old = await mounted();
    expect(byTestid(old, "companies-owner-mine").exists()).toBe(false);
    expect(leads.GET_Companies).toHaveBeenLastCalledWith({ sort: "-last_activity_at", page: 1, page_size: 20 });
  });

  // Acceptance m15: a column empty on every row of the page is not drawn.
  it("hides Score and Origin when no row of the page has one", async () => {
    const keys = (wrapper) => wrapper.findComponent('[data-testid="companies-table"]').props("columns").map((column) => column.key);
    expect(keys(await mounted())).toContain("score");
    leads.GET_Companies.mockResolvedValue({ data: { count: 1, results: [company(1, { score_segment: null, score_points: null, origin: "" })] } });
    const empty = keys(await mounted());
    expect(empty).not.toContain("score");
    expect(empty).not.toContain("origin");
    expect(empty).toContain("stage");
  });
});
