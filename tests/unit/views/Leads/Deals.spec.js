import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const leads = vi.hoisted(() => ({
  GET_Deals: vi.fn(),
  GET_DealStages: vi.fn(),
  POST_DealTransition: vi.fn(),
}));
const desktop = vi.hoisted(() => ({ on: true }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleAtLeast: () => true, isModuleInstalled: () => true }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: () => true }) }));
vi.mock("@/composables/useIsDesktop", async () => {
  const { ref } = await import("vue");
  return { useIsDesktop: () => ref(desktop.on) };
});
const route = vi.hoisted(() => ({ name: "LeadsDeals", query: {} }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => route, useRouter: () => router }));

import Deals from "@/views/Leads/Deals.vue";
import { setLang } from "@/i18n";
import { control, setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const STAGES = [
  { key: "qualified", label: "Qualified", kind: "open", order: 0 },
  { key: "won", label: "Won", kind: "won", order: 10 },
  { key: "lost", label: "Lost", kind: "lost", order: 20 },
];
const deal = (id, extra = {}) => ({
  id, title: `Deal ${id}`, company: { id: 9, name: "Acme", domain: "acme.test" }, owner: null, stage: STAGES[0],
  value_one_off: "12400.00", value_recurring: null, recurring_period: "month", currency: "PLN", expected_close_date: null, open_tasks: 1, ...extra,
});
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(Deals, { area: "leads.companies", stubs: { ...crmStubs, DealDialog: true }, ...options });
  await flushPromises();
  return wrapper;
};

// Plan 16: Deals — the list on every width, its state in the URL, the stage select on the row.
describe("Leads → Deals list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    desktop.on = true;
    route.query = {};
    leads.GET_DealStages.mockResolvedValue({ data: { results: STAGES } });
    leads.GET_Deals.mockResolvedValue({ data: { count: 45, results: [deal(1), deal(2)] } });
    leads.POST_DealTransition.mockResolvedValue({ data: deal(1, { stage: STAGES[2] }) });
  });

  it("asks one server page of my open deals, soonest close first", async () => {
    const wrapper = await mounted();
    expect(leads.GET_Deals).toHaveBeenCalledWith({ owner: "me", kind: "open", sort: "expected_close_date", page: 1, page_size: 20 });
    expect(wrapper.findAll('[data-testid="deal-row"]')).toHaveLength(2);
    expect(wrapper.findComponent({ name: "Pagination" }).props("pages")).toBe(3);
  });

  it("reads the filters from the URL and writes a close range back as one change", async () => {
    route.query = { owner: "all", kind: "all", stage: "qualified", page: "2" };
    const wrapper = await mounted();
    expect(leads.GET_Deals).toHaveBeenCalledWith({ stage: "qualified", sort: "expected_close_date", page: 2, page_size: 20 });
    setControl(wrapper, "deals-filter-close", "2026-11-01 – 2026-11-30");
    expect(router.replace).toHaveBeenLastCalledWith({ query: { owner: "all", kind: "all", stage: "qualified", close_from: "2026-11-01", close_to: "2026-11-30" } });
    table(wrapper).vm.$emit("sort", { key: "one_off", direction: "desc" });
    expect(router.replace.mock.lastCall[0].query.sort).toBe("-value_one_off");
  });

  it("a move to a lost stage is impossible without a reason", async () => {
    const wrapper = await mounted();
    setControl(wrapper, "deal-row-stage", "lost");
    await flushPromises();
    expect(byTestid(wrapper, "deal-lost-dialog").exists()).toBe(true);
    await byTestid(wrapper, "deal-lost-submit").trigger("click");
    expect(leads.POST_DealTransition).not.toHaveBeenCalled();
    control(wrapper, "deal-lost-reason").vm.$emit("update:modelValue", "Too expensive");
    await byTestid(wrapper, "deal-lost-submit").trigger("click");
    await flushPromises();
    expect(leads.POST_DealTransition).toHaveBeenCalledWith(1, "lost", "Too expensive");
  });

  it("says the stage once: a plain column header, no label in the rows, the value only in its own column", async () => {
    const wrapper = await mounted();
    expect(table(wrapper).props("columns").find((column) => column.key === "stage").label).toBe("Deal stage") // n2: one name for it;
    expect(table(wrapper).props("columns").find((column) => column.key === "owner").width).toBe("max-content");
    const rowSelects = wrapper.findAllComponents({ name: "BasicSelect" }).filter((select) => select.attributes("data-testid") === "deal-row-stage");
    expect(rowSelects.every((select) => !select.props("floatingLabel"))).toBe(true);
    const summary = table(wrapper).props("rows")[0].summary;
    expect(summary).toBe("Acme");
    expect(table(wrapper).props("rows")[0].one_off).toContain("12400.00");
  });

  it("?view=board on a phone lands on the list and says the board is for a larger screen", async () => {
    desktop.on = false;
    route.query = { view: "board" };
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-board-desktop-only").exists()).toBe(true);
    desktop.on = true;
    expect(byTestid(await mounted(), "deals-board-desktop-only").exists()).toBe(false);
  });

  // P9 (walk 3): the List / Board switch follows a language switch made while the page is open
  it("the List / Board switch reads the current language", async () => {
    desktop.on = true;
    const wrapper = await mounted();
    const labels = () => wrapper.findComponent('[data-testid="deals-view"]').props("options").map((option) => option.label);
    expect(labels()).toEqual(["List", "Board"]);
    setLang("PL");
    await flushPromises();
    expect(labels()).toEqual(["Lista", "Tablica"]);
    setLang("EN");
  });

  it("a won stage moves at once", async () => {
    const wrapper = await mounted();
    setControl(wrapper, "deal-row-stage", "won");
    await flushPromises();
    expect(leads.POST_DealTransition).toHaveBeenCalledWith(1, "won", "");
  });

  it("at 390 px: no List · Board switch, every column but deal and stage gives way (no sideways scroll)", async () => {
    desktop.on = false;
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-view").exists()).toBe(false);
    const columns = table(wrapper).props("columns");
    expect(columns.filter((column) => !column.priority).map((column) => column.key)).toEqual(["title", "stage"]);
    expect(columns.find((column) => column.key === "title").width).toBe("1fr");
  });

  it("read-only: no Open deal; won and lost filters show the kind badge, not the select", async () => {
    route.query = { kind: "won" };
    const wrapper = await mounted({ write: false });
    expect(byTestid(wrapper, "deals-open").exists()).toBe(false);
    expect(byTestid(wrapper, "deal-row-stage").exists()).toBe(false);
  });

  // Plan 29: the archive is its own button on the list, not a status
  const archivedDeal = deal(1, { stage: STAGES[1], archived_at: "2026-11-14T10:00:00Z" });

  it("the Archived button asks with archived=true, its title names the archive, the status filter is gone", async () => {
    route.query = { kind: "won", archived: "1", search: "acme" };
    leads.GET_Deals.mockResolvedValue({ data: { count: 1, results: [archivedDeal] } });
    const wrapper = await mounted();
    expect(leads.GET_Deals).toHaveBeenCalledWith({ owner: "me", archived: true, search: "acme", sort: "expected_close_date", page: 1, page_size: 20 });
    expect(byTestid(wrapper, "deals-archived").attributes("aria-pressed")).toBe("true");
    expect(wrapper.findComponent({ name: "PageHeader" }).props("title")).toBe("leads.deals.archived_title");
    expect(byTestid(wrapper, "deals-filter-kind").exists()).toBe(false);
    expect(byTestid(wrapper, "deal-row-stage").exists()).toBe(false);
    expect(byTestid(wrapper, "deal-row").text()).toContain("Won");
  });

  it("pressing Archived keeps the query; pressing it again restores the list as it was", async () => {
    route.query = { owner: "all", kind: "lost", page: "2" };
    leads.GET_Deals.mockResolvedValue({ data: { count: 1, results: [deal(1, { archived_at: null })] } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-archived").attributes("aria-pressed")).toBe("false");
    expect(byTestid(wrapper, "deals-filter-kind").exists()).toBe(true);
    await byTestid(wrapper, "deals-archived").trigger("click");
    expect(router.replace).toHaveBeenLastCalledWith({ query: { owner: "all", kind: "lost", archived: "1" } });
    route.query = { owner: "all", kind: "lost", archived: "1" };
    const pressed = await mounted();
    await byTestid(pressed, "deals-archived").trigger("click");
    expect(router.replace).toHaveBeenLastCalledWith({ query: { owner: "all", kind: "lost" } });
  });

  it("an empty archive says there is no archived deal", async () => {
    route.query = { archived: "1" };
    leads.GET_Deals.mockResolvedValue({ data: { count: 0, results: [] } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-empty-archived").exists()).toBe(true);
    expect(leads.GET_Deals).toHaveBeenCalledTimes(1);
  });

  it("the Archived button only once the backend sends archived_at; a read-only role sees it", async () => {
    expect(byTestid(await mounted(), "deals-archived").exists()).toBe(false);
    leads.GET_Deals.mockResolvedValue({ data: { count: 1, results: [deal(1, { archived_at: null })] } });
    expect(byTestid(await mounted(), "deals-archived").exists()).toBe(true);
    expect(byTestid(await mounted({ write: false }), "deals-archived").exists()).toBe(true);
  });

  it("read-only: the row stage select is disabled", async () => {
    const wrapper = await mounted({ write: false });
    expect(wrapper.findComponent('[data-testid="deal-row-stage"]').props("disabled")).toBe(true);
  });

  it("the default list with no deal shows the first-run empty state, not Clear filters", async () => {
    leads.GET_Deals.mockResolvedValue({ data: { count: 0, results: [] } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-empty").exists()).toBe(true);
    expect(byTestid(wrapper, "deals-clear-filters").exists()).toBe(false);
  });

  // N18: Mine empty while others have deals — say so, offer them all
  it("an empty Mine with deals under All offers Show all", async () => {
    leads.GET_Deals.mockResolvedValueOnce({ data: { count: 0, results: [] } }).mockResolvedValueOnce({ data: { count: 9, results: [deal(1)] } });
    const wrapper = await mounted();
    expect(leads.GET_Deals).toHaveBeenLastCalledWith({ kind: "open", page_size: 1 });
    expect(byTestid(wrapper, "deals-empty").exists()).toBe(false);
    await byTestid(wrapper, "deals-show-all").trigger("click");
    expect(router.replace).toHaveBeenCalledWith({ query: { owner: "all" } });
  });

  // N20: a phone has no value column — the value is on the row's second line
  it("on a phone the row's second line carries the value", async () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: query.includes("max-width"), addEventListener() {}, removeEventListener() {} }));
    const wrapper = await mounted();
    expect(wrapper.get('[data-testid="deal-row"]').text()).toContain("Acme · 12400.00 PLN");
    matchMedia.mockRestore();
  });

  it("an older answer never replaces a newer one", async () => {
    let first;
    leads.GET_Deals.mockReturnValueOnce(new Promise((resolve) => (first = resolve)));
    const wrapper = await mounted();
    route.query = { owner: "all" };
    leads.GET_Deals.mockResolvedValueOnce({ data: { count: 1, results: [deal(3)] } });
    wrapper.vm.$.setupState.load?.();
    await flushPromises();
    first({ data: { count: 2, results: [deal(1), deal(2)] } });
    await flushPromises();
    expect(wrapper.findAll('[data-testid="deal-row"]').map((row) => row.attributes("data-deal"))).toEqual(["3"]);
  });

  it("no deal stages: the set-up empty state", async () => {
    leads.GET_DealStages.mockResolvedValue({ data: { results: [] } });
    leads.GET_Deals.mockResolvedValue({ data: { count: 0, results: [] } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-no-stages").exists()).toBe(true);
  });
});

const table = (wrapper) => wrapper.findComponent('[data-testid="deals-table"]');
