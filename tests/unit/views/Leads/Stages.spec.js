import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Stages: vi.fn(), PATCH_Stage: vi.fn(), DELETE_Stage: vi.fn(), POST_Stage: vi.fn() }));
vi.mock("@/api/leads/api", () => api);

import Stages from "@/views/Leads/Stages.vue";

const stubs = { draggable: { props: ["list"], template: "<div><slot v-for='(el, i) in list' name='item' :element='el' :index='i' /></div>" } };
const stages = () => [{ id: 1, key: "new", label: "New", order: 0, kind: "open" }, { id: 2, key: "won", label: "Won", order: 1, kind: "won" }];

describe("Leads Stages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Stages.mockImplementation(() => Promise.resolve({ data: { results: stages() } }));
  });

  it("shows a 409 on delete inline, not as a toast (L-18)", async () => {
    api.DELETE_Stage.mockRejectedValue({ response: { status: 409, data: { detail: "move 3 companies first" } } });
    const wrapper = mount(Stages, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('[data-testid="stage-delete"]')[0].trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="stage-error"]').text()).toBe("move 3 companies first");
  });

  it("moving a stage down patches the new order of both stages", async () => {
    api.PATCH_Stage.mockResolvedValue({ data: {} });
    const wrapper = mount(Stages, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('[data-testid="stage-row"]')[0].findAll("button")[1].trigger("click");
    await flushPromises();
    expect(api.PATCH_Stage).toHaveBeenCalledWith(2, { order: 0 });
    expect(api.PATCH_Stage).toHaveBeenCalledWith(1, { order: 1 });
  });
});
