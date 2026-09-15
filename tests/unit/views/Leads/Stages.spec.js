import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Stages: vi.fn(), PATCH_Stage: vi.fn(), DELETE_Stage: vi.fn(), POST_Stage: vi.fn() }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/leads/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import Stages from "@/views/Leads/Stages.vue";

const stubs = { draggable: { props: ["list"], template: "<div><slot v-for='(el, i) in list' name='item' :element='el' :index='i' /></div>" } };
const stages = () => [{ id: 1, key: "new", label: "New", order: 0, kind: "open" }, { id: 2, key: "won", label: "Won", order: 10, kind: "won" }];

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

  async function moveFirstDown() {
    const wrapper = mount(Stages, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('[data-testid="stage-row"]')[0].findAll("button")[1].trigger("click");
    await flushPromises();
    return wrapper;
  }

  it("moving a stage down renumbers in steps of 10, one PATCH after the other", async () => {
    let pending = 0;
    api.PATCH_Stage.mockImplementation(async () => {
      expect(pending).toBe(0);
      pending += 1;
      await Promise.resolve();
      pending -= 1;
      return { data: {} };
    });
    await moveFirstDown();
    expect(api.PATCH_Stage.mock.calls).toEqual([[2, { order: 0 }], [1, { order: 10 }]]);
  });

  it("the first refused PATCH stops the renumber, toasts and reloads the list", async () => {
    api.PATCH_Stage.mockRejectedValue({ response: { data: { detail: "nope" } } });
    const wrapper = await moveFirstDown();
    expect(api.PATCH_Stage).toHaveBeenCalledTimes(1);
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "nope", type: "negative" });
    expect(api.GET_Stages).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('[data-testid="stage-row"]')[0].attributes("data-stage")).toBe("new");
  });

  it("a new stage goes after the highest order", async () => {
    api.POST_Stage.mockResolvedValue({ data: {} });
    const wrapper = mount(Stages, { global: { stubs } });
    await flushPromises();
    const inputs = wrapper.find('[data-testid="stage-add"]').findAll("input");
    await inputs[0].setValue("lost");
    await inputs[1].setValue("Lost");
    await wrapper.find('[data-testid="stage-add"]').trigger("submit");
    await flushPromises();
    expect(api.POST_Stage).toHaveBeenCalledWith({ key: "lost", label: "Lost", order: 20 });
  });
});
