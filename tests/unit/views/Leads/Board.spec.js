import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const company = () => ({ id: 1, domain: "a.test", company_type: "RETAILER", do_not_contact: false, stage: { key: "new" } });
const api = vi.hoisted(() => ({
  GET_Stages: vi.fn(),
  GET_Rules: vi.fn(),
  GET_Companies: vi.fn(),
  POST_Transition: vi.fn(),
}));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/leads/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import Board from "@/views/Leads/Board.vue";
import BoardColumn from "@/views/Leads/BoardColumn.vue";

const stubs = { draggable: { props: ["list"], template: "<div><slot v-for='el in list' name='item' :element='el' /></div>" }, RouterLink: true };

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
});
