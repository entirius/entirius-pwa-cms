import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const company = () => ({ id: 1, name: "Example Shop 1", domain: "a.test", company_type: "RETAILER", do_not_contact: false, stage: { key: "new" } });
const api = vi.hoisted(() => ({
  GET_Stages: vi.fn(),
  GET_Rules: vi.fn(),
  GET_Companies: vi.fn(),
  POST_Transition: vi.fn(),
}));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/leads/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
const push = vi.hoisted(() => vi.fn());
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import Board from "@/views/Leads/Board.vue";
import BoardColumn from "@/views/Leads/BoardColumn.vue";

const stubs = {
  draggable: { props: ["list"], template: "<div><slot v-for='el in list' name='item' :element='el' /></div>" },
  RouterLink: { template: "<a><slot /></a>" },
  FontAwesomeIcon: true,
};

async function mountBoard() {
  const wrapper = mount(Board, { global: { stubs } });
  await flushPromises();
  return wrapper;
}

const column = (wrapper, key) => wrapper.findAllComponents(BoardColumn).find((c) => c.props("stage").key === key);

describe("Leads Board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Stages.mockResolvedValue({ data: { results: [{ id: 1, key: "new", label: "New" }, { id: 2, key: "contacted", label: "Contacted" }] } });
    api.GET_Rules.mockResolvedValue({ data: { results: [{ id: 5, stage_id: 1, is_active: true, action: "communicate", template_key: "cold", contact_strategy: "primary" }] } });
    api.GET_Companies.mockImplementation(({ stage }) =>
      Promise.resolve({ data: { results: stage === "new" ? [company()] : [], count: stage === "new" ? 1 : 0, next: null } })
    );
  });

  it("loads one column per stage with allowlisted query keys and the rule badge", async () => {
    const wrapper = await mountBoard();
    expect(api.GET_Companies).toHaveBeenCalledWith({ stage: "new", search: "", sort: "-last_activity_at", page: 1 });
    expect(column(wrapper, "new").props("rules")).toHaveLength(1);
    expect(column(wrapper, "contacted").props("rules")).toHaveLength(0);
  });

  // FIX-17b item 6 / FIX-17c item 7: "More stages" follows the measured overflow of the columns, not a guess.
  it("the More stages button shows while columns run past the right edge and hides at the end", async () => {
    const wrapper = await mountBoard();
    const board = wrapper.get('[data-testid="board-columns"]');
    expect(wrapper.find('[data-testid="board-scroll-right"]').exists()).toBe(false);
    const layout = { clientWidth: 1000, scrollWidth: 1400, scrollLeft: 0 };
    Object.keys(layout).forEach((key) => Object.defineProperty(board.element, key, { get: () => layout[key], configurable: true }));
    board.element.scrollBy = vi.fn();
    window.dispatchEvent(new Event("resize"));
    await flushPromises();
    await wrapper.get('[data-testid="board-scroll-right"]').trigger("click");
    expect(board.element.scrollBy).toHaveBeenCalledWith({ left: 260, behavior: "smooth" });
    layout.scrollLeft = 400;
    await board.trigger("scroll");
    expect(wrapper.find('[data-testid="board-scroll-right"]').exists()).toBe(false);
  });

  it("a drop calls transition and keeps the card in the target column", async () => {
    api.POST_Transition.mockResolvedValue({ data: { stage: { key: "contacted" } } });
    const wrapper = await mountBoard();
    const card = column(wrapper, "new").props("cards")[0];
    column(wrapper, "contacted").vm.$emit("move", card, "contacted", false);
    await flushPromises();
    expect(api.POST_Transition).toHaveBeenCalledWith(1, "contacted");
    expect(column(wrapper, "contacted").props("cards").map((c) => c.id)).toEqual([1]);
    expect(column(wrapper, "new").props("cards")).toEqual([]);
  });

  it("a refused move snaps back and shows the API message", async () => {
    api.POST_Transition.mockRejectedValue({ response: { data: { detail: "Stage not found." } } });
    const wrapper = await mountBoard();
    const card = column(wrapper, "new").props("cards")[0];
    column(wrapper, "contacted").vm.$emit("move", card, "contacted", false);
    await flushPromises();
    expect(column(wrapper, "new").props("cards").map((c) => c.id)).toEqual([1]);
    expect(column(wrapper, "contacted").props("cards")).toEqual([]);
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "Stage not found.", type: "negative" });
  });

  it.each([
    ["board-filter-reply", "has_reply"],
    ["board-filter-dnc", "do_not_contact"],
  ])("chip %s reloads columns from page 1 with %s and the server count", async (testid, param) => {
    const wrapper = await mountBoard();
    api.GET_Companies.mockClear();
    api.GET_Companies.mockResolvedValue({ data: { results: [], count: 0, next: null } });
    await wrapper.find(`[data-testid="${testid}"]`).trigger("click");
    await flushPromises();
    expect(api.GET_Companies).toHaveBeenCalledWith({ stage: "new", search: "", sort: "-last_activity_at", page: 1, [param]: true });
    expect(column(wrapper, "new").props("count")).toBe(0);
    expect(column(wrapper, "new").props("cards")).toEqual([]);
  });

  it("two quick filter toggles: the late response of the first does not overwrite the second", async () => {
    const wrapper = await mountBoard();
    const late = [];
    api.GET_Companies.mockImplementation((params) =>
      params.has_reply
        ? new Promise((resolve) => late.push(() => resolve({ data: { results: [company()], count: 1, next: null } })))
        : Promise.resolve({ data: { results: [], count: 0, next: null } })
    );
    const chip = wrapper.find('[data-testid="board-filter-reply"]');
    await chip.trigger("click");
    await chip.trigger("click");
    await flushPromises();
    late.forEach((resolve) => resolve());
    await flushPromises();
    expect(column(wrapper, "new").props("count")).toBe(0);
    expect(column(wrapper, "new").props("cards")).toEqual([]);
  });

  it("a cleared filter is omitted from the query", async () => {
    const wrapper = await mountBoard();
    const chip = wrapper.find('[data-testid="board-filter-reply"]');
    await chip.trigger("click");
    await chip.trigger("click");
    await flushPromises();
    expect(api.GET_Companies).toHaveBeenLastCalledWith({ stage: "contacted", search: "", sort: "-last_activity_at", page: 1 });
  });

  // FIX-17 item 15: a card is read by its company name; the domain sits below it, dates and counts read as words.
  it("a card names the company, keeps the domain below it and counts rules in grammar", async () => {
    const wrapper = await mountBoard();
    const card = wrapper.get('[data-testid="board-card"]');
    expect(card.get('[data-testid="board-card-name"]').text()).toBe("Example Shop 1");
    expect(card.text()).toContain("a.test");
    expect(card.text()).toContain("Retailer");
    expect(card.text()).not.toContain("RETAILER");
    expect(wrapper.get('[data-testid="board-column-rules"]').text()).toBe("leads.board.rules_one::{\"count\":1}");
  });

  // FIX-17b item 6: the whole card opens the company; no activity is said in words, never a bare dash.
  it("a click anywhere on the card opens the company, the stage select does not", async () => {
    const wrapper = await mountBoard();
    const card = wrapper.get('[data-testid="board-card"]');
    expect(card.get('[data-testid="board-card-activity"]').text()).toContain("No activity yet");
    await card.get('[data-testid="board-card-stage"]').trigger("click");
    expect(push).not.toHaveBeenCalled();
    await card.get(".card__domain").trigger("click");
    expect(push).toHaveBeenCalledWith({ name: "LeadsThread", params: { id: 1 } });
  });
});
