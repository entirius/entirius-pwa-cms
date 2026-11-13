import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const leads = vi.hoisted(() => ({ GET_DealBoard: vi.fn(), POST_DealTransition: vi.fn() }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: () => true }) }));
const route = vi.hoisted(() => ({ name: "LeadsDealsBoard", query: {} }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => route, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import DealsBoard from "@/views/Leads/DealsBoard.vue";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const stage = (key, kind, order) => ({ id: order, key, label: key, kind, order });
const deal = (id, stageRow) => ({ id, title: `Deal ${id}`, company: { id: 1, name: "Acme" }, owner: null, stage: stageRow, value_one_off: "100.00", currency: "PLN" });
function board() {
  const open = stage("qualified", "open", 0);
  const lost = stage("lost", "lost", 20);
  return [
    { stage: open, count: 30, totals: [{ currency: "EUR", one_off: "500.00", recurring: "0.00" }, { currency: "PLN", one_off: "12400.00", recurring: "800.00" }], deals: [deal(1, open)] },
    { stage: stage("won", "won", 10), count: 0, totals: [], deals: [] },
    { stage: lost, count: 0, totals: [], deals: [] },
  ];
}
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(DealsBoard, { area: "leads.companies", stubs: { ...crmStubs, DealDialog: true }, ...options });
  await flushPromises();
  return wrapper;
};
const column = (wrapper, key) => wrapper.findAllComponents({ name: "DealBoardColumn" }).find((c) => c.props("column").stage.key === key);
// What vuedraggable does on a drop: the card is already in the target list, then `change` says so.
function drop(wrapper, key, card) {
  const target = column(wrapper, key);
  target.props("column").deals.push(card);
  column(wrapper, "qualified").props("column").deals.splice(0, 1);
  target.findComponent({ name: "draggable" }).vm.$emit("change", { added: { element: card } });
}

// Plan 16: the deals board — totals per currency, drag and drop with the lost reason, a refused move snaps back.
describe("Leads → Deals board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    route.query = {};
    leads.GET_DealBoard.mockResolvedValue({ data: { results: board() } });
  });

  it("one totals line per currency, never added across; Show all past the first 25", async () => {
    const wrapper = await mounted();
    expect(leads.GET_DealBoard).toHaveBeenCalledWith({ owner: "me" });
    const lines = byTestid(column(wrapper, "qualified"), "deals-column-totals").findAll("span").map((span) => span.text());
    expect(lines).toEqual(["500.00 EUR", "12400.00 PLN", "800.00 PLN / month"]);
    expect(byTestid(column(wrapper, "qualified"), "deals-column-all").exists()).toBe(true);
    expect(byTestid(column(wrapper, "won"), "deals-column-all").exists()).toBe(false);
  });

  it("an empty column keeps a body that takes a drop and says it is empty", async () => {
    const wrapper = await mounted();
    const won = column(wrapper, "won");
    expect(won.findComponent({ name: "draggable" }).exists()).toBe(true);
    expect(byTestid(won, "deals-column-empty").text()).toBe("leads.deals.column_empty");
    expect(byTestid(column(wrapper, "qualified"), "deals-column-empty").exists()).toBe(false);
  });

  it("a move with the card's select says so in a toast", async () => {
    leads.POST_DealTransition.mockResolvedValue({ data: { ...deal(1, stage("qualified", "open", 0)), stage: stage("negotiation", "open", 5) } });
    const wrapper = await mounted();
    column(wrapper, "qualified").findComponent({ name: "DealCard" }).vm.$emit("move", column(wrapper, "qualified").props("column").deals[0], "negotiation");
    await flushPromises();
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "Deal moved to negotiation", type: "positive" });
  });

  it("a drop on a lost column asks the reason first; Cancel snaps the card back", async () => {
    const wrapper = await mounted();
    const card = column(wrapper, "qualified").props("column").deals[0];
    drop(wrapper, "lost", card);
    await flushPromises();
    expect(byTestid(wrapper, "deal-lost-dialog").exists()).toBe(true);
    expect(leads.POST_DealTransition).not.toHaveBeenCalled();
    wrapper.findComponent({ name: "LostReasonDialog" }).vm.$emit("cancel");
    await flushPromises();
    expect(column(wrapper, "lost").props("column").deals).toHaveLength(0);
    expect(column(wrapper, "qualified").props("column").deals.map((row) => row.id)).toEqual([1]);
  });

  it("a refused move snaps back with the API message", async () => {
    leads.POST_DealTransition.mockRejectedValue({ response: { data: { detail: "Not allowed" } } });
    const wrapper = await mounted();
    drop(wrapper, "won", column(wrapper, "qualified").props("column").deals[0]);
    await flushPromises();
    expect(leads.POST_DealTransition).toHaveBeenCalledWith(1, "won", "");
    expect(column(wrapper, "won").props("column").deals).toHaveLength(0);
    expect(column(wrapper, "qualified").props("column").deals).toHaveLength(1);
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ msg: "Not allowed", type: "negative" }));
  });

  it("read-only users cannot drag and get no Open deal", async () => {
    const wrapper = await mounted({ write: false });
    const lists = wrapper.findAllComponents({ name: "draggable" });
    expect(lists.length).toBe(3);
    lists.forEach((list) => expect(list.vm.$attrs.disabled).toBe(true));
    expect(byTestid(wrapper, "deals-open").exists()).toBe(false);
  });

  it("without a won or a lost stage the board says deals cannot be closed", async () => {
    leads.GET_DealBoard.mockResolvedValue({ data: { results: board().slice(0, 2) } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deals-cannot-close").exists()).toBe(true);
  });
});
