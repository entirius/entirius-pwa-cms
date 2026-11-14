import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const leads = vi.hoisted(() => ({
  GET_Deal: vi.fn(),
  GET_DealStages: vi.fn(),
  GET_Company: vi.fn(),
  GET_Attributes: vi.fn(),
  GET_DealActivities: vi.fn(),
  POST_DealTransition: vi.fn(),
  DELETE_Deal: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleInstalled: () => true }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: () => true }) }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => ({ name: "LeadsDeal", params: { id: "7" }, query: {} }), useRouter: () => router }));

import Deal from "@/views/Leads/Deal.vue";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const STAGES = [
  { key: "qualified", label: "Qualified", kind: "open" },
  { key: "proposal", label: "Proposal", kind: "open" },
  { key: "won", label: "Won", kind: "won" },
  { key: "lost", label: "Lost", kind: "lost" },
];
const deal = (stage = STAGES[1], extra = {}) => ({
  id: 7, title: "Shop rebuild", company: { id: 3, name: "Acme", domain: "acme.test" }, contact: null, owner: null, stage,
  stage_entered_at: "2026-11-02T10:00:00Z", value_one_off: "12400.00", value_recurring: null, recurring_period: "month", currency: "PLN",
  expected_close_date: null, lost_reason: "", attributes: {}, subject_ref: "leads.Deal:7", subject_label: "Acme — Shop rebuild", ...extra,
});
const BasicMenu = { name: "BasicMenu", props: ["items", "label", "placement"], emits: ["select"], template: "<div><slot name='trigger' /></div>" };
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(Deal, { area: "leads.companies", stubs: { ...crmStubs, BasicMenu, TasksTab: true, DealDetails: true, ReadonlyArea: { template: "<div><slot /></div>" } }, ...options });
  await flushPromises();
  return wrapper;
};

// Plan 16: the deal card — Mark won / Mark lost / Reopen, delete for an open deal, History in stage labels.
describe("Leads → Deal card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    leads.GET_Deal.mockResolvedValue({ data: deal() });
    leads.GET_DealStages.mockResolvedValue({ data: { results: STAGES } });
    leads.GET_Company.mockResolvedValue({ data: { id: 3, name: "Acme", contacts: [] } });
    leads.GET_Attributes.mockResolvedValue({ data: { results: [] } });
    leads.GET_DealActivities.mockResolvedValue({ data: { results: [{ id: 1, message: "deal qualified -> proposal", data: { from: "qualified", to: "proposal" } }] } });
    leads.POST_DealTransition.mockResolvedValue({ data: deal(STAGES[2]) });
  });

  it("an open deal: Mark won moves it to the first won stage; History reads the stage labels", async () => {
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deal-more").exists()).toBe(true);
    expect(byTestid(wrapper, "deal-reopen").exists()).toBe(false);
    expect(byTestid(wrapper, "timeline-event").text()).toContain("Qualified → Proposal");
    await byTestid(wrapper, "deal-mark-won").trigger("click");
    await flushPromises();
    expect(leads.POST_DealTransition).toHaveBeenCalledWith(7, "won", "");
    expect(byTestid(wrapper, "deal-kind").text()).toContain("Won");
  });

  // N19: the more menu (Delete deal), Mark lost, Mark won — the primary rightmost, no red button in the row
  it("the action bar: the more menu holds Delete deal, then Mark lost, then Mark won", async () => {
    const wrapper = await mounted();
    const order = ["deal-more", "deal-mark-lost", "deal-mark-won"].map((id) => wrapper.html().indexOf(`data-testid="${id}"`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index > 0)).toBe(true);
    expect(wrapper.findComponent({ name: "BasicMenu" }).props("items").map((item) => item.key)).toEqual(["delete"]);
  });

  it("the reason dialog closes with Close, like the task dialog", async () => {
    const wrapper = await mounted();
    await byTestid(wrapper, "deal-mark-lost").trigger("click");
    const labels = wrapper.findComponent({ name: "LostReasonDialog" }).findComponent({ name: "BasicModal" }).props("actions").map((action) => action.label);
    expect(labels[0]).toBe("Close");
  });

  it("Mark lost asks the reason before any call", async () => {
    const wrapper = await mounted();
    await byTestid(wrapper, "deal-mark-lost").trigger("click");
    expect(byTestid(wrapper, "deal-lost-dialog").exists()).toBe(true);
    expect(leads.POST_DealTransition).not.toHaveBeenCalled();
  });

  it("a closed deal: Reopen to the first open stage only, its lost reason, no delete", async () => {
    leads.GET_Deal.mockResolvedValue({ data: deal(STAGES[3], { lost_reason: "Too expensive" }) });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deal-lost-line").text()).toContain("Too expensive");
    expect(byTestid(wrapper, "deal-more").exists()).toBe(false);
    expect(byTestid(wrapper, "deal-mark-won").exists()).toBe(false);
    await byTestid(wrapper, "deal-reopen").trigger("click");
    expect(leads.POST_DealTransition).toHaveBeenCalledWith(7, "qualified", "");
  });

  it("delete asks first, then goes back to Deals", async () => {
    leads.DELETE_Deal.mockResolvedValue({});
    const wrapper = await mounted();
    wrapper.findComponent({ name: "BasicMenu" }).vm.$emit("select", { key: "delete" });
    await flushPromises();
    await byTestid(wrapper, "deal-delete-confirm").trigger("click");
    await flushPromises();
    expect(leads.DELETE_Deal).toHaveBeenCalledWith(7);
    expect(router.push).toHaveBeenCalledWith({ name: "LeadsDeals" });
  });

  it("read-only: no action", async () => {
    const wrapper = await mounted({ write: false });
    ["deal-mark-won", "deal-mark-lost", "deal-more"].forEach((id) => expect(byTestid(wrapper, id).exists()).toBe(false));
  });

  it("a closed deal without an open stage offers no Reopen", async () => {
    leads.GET_Deal.mockResolvedValue({ data: deal(STAGES[2]) });
    leads.GET_DealStages.mockResolvedValue({ data: { results: STAGES.slice(2) } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deal-reopen").exists()).toBe(false);
  });

  it("a 404 says the deal was not found", async () => {
    leads.GET_Deal.mockRejectedValue(Object.defineProperty({ message: "x" }, "httpStatus", { value: 404 }));
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deal-not-found").text()).toContain("Deal not found");
  });
});
