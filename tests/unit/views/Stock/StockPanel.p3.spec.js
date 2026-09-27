import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/stock/api", () => ({
  GET_Warehouses: vi.fn().mockResolvedValue({
    data: [
      { code: "main", name: "Main", source_type: "manual" },
      { code: "ext", name: "External", source_type: "integration" },
    ],
  }),
}));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderEnd() {}, loaderFinish() {} }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification() {} }) }));

import StockPanel from "@/views/Stock/index.vue";

const BasicSelect = { name: "BasicSelect", props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<div />" };

// Plan 17: the warehouse picker's `@onSelect` handler now hangs on BasicSelect `@update:model-value`.
describe("Stock panel — warehouse picker on BasicSelect", () => {
  it("makes the picked warehouse active", async () => {
    const wrapper = mount(StockPanel, { global: { stubs: { BasicSelect, RouterView: true } } });
    await flushPromises();
    const select = wrapper.findComponent({ name: "BasicSelect" });
    const first = select.props("modelValue");
    const other = first === "main" ? "ext" : "main";
    await select.vm.$emit("update:modelValue", other);
    expect(wrapper.vm.activeWarehouse.code).toBe(other);
    expect(select.props("modelValue")).toBe(other);
  });
});
