import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/deliverypoints/api", () => ({
  GET_Points: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  GET_PointsChannel: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  GET_DPChannels: vi.fn().mockResolvedValue({ data: [{ idx: "b2c", name: "B2C" }] }),
}));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderEnd() {}, loaderFinish() {} }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification() {} }) }));

import { GET_Points, GET_PointsChannel } from "@/api/deliverypoints/api";
import PointList from "@/views/Points/PointList.vue";

const BasicSelect = { name: "BasicSelect", props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<div />" };

// Plan 17: the channel filter's `@onSelect` handler now hangs on BasicSelect `@update:model-value`.
describe("PointList — channel filter on BasicSelect", () => {
  it("fetches the picked channel's points, and all points for the 'all' option", async () => {
    const wrapper = mount(PointList, {
      global: { stubs: { BasicSelect, DataTable: true, MobileFilterPanel: true, Pagination: true, FloatingActions: true } },
    });
    await flushPromises();
    const select = wrapper.findComponent({ name: "BasicSelect" });
    await select.vm.$emit("update:modelValue", "b2c");
    expect(GET_PointsChannel).toHaveBeenLastCalledWith("b2c", expect.any(Object));
    expect(select.props("modelValue")).toBe("b2c");
    GET_Points.mockClear();
    await select.vm.$emit("update:modelValue", "__all");
    expect(GET_Points).toHaveBeenCalledTimes(1);
  });
});
