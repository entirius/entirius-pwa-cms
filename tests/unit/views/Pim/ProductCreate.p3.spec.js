import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/pim/api", () => ({
  POST_Product: vi.fn(),
  GET_FeatureSets: () => Promise.resolve({ data: { results: [{ idx: "outdoor", name: "Outdoor" }] } }),
  POST_AddToChannel: vi.fn(),
}));
vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));
vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({ activeChannelIdx: "pl", channels: [{ idx: "pl", name: "PL" }, { idx: "de", name: "DE" }] }),
}));

import ProductCreate from "@/views/Pim/ProductCreate.vue";

const CheckboxStub = { name: "BasicCheckbox", props: ["modelValue"], emits: ["update:modelValue"], template: "<div><slot /></div>" };
const SelectStub = { name: "BasicSelect", props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<div />" };

const mountCreate = () =>
  mount(ProductCreate, {
    global: {
      components: { BasicCheckbox: CheckboxStub, BasicSelect: SelectStub },
      stubs: { teleport: true, IconButton: true, BasicSwitch: true, FormField: { template: "<div><slot /></div>" } },
    },
  });

describe("ProductCreate — P3 controls", () => {
  it("the feature set select fills form.feature_set_idx", async () => {
    const wrapper = mountCreate();
    await flushPromises();

    await wrapper.findComponent(SelectStub).vm.$emit("update:modelValue", "outdoor");
    expect(wrapper.vm.form.feature_set_idx).toBe("outdoor");
  });

  it("a channel checkbox adds the channel with inherit on, the inherit checkbox turns it off", async () => {
    const wrapper = mountCreate();
    await flushPromises();

    const channel = wrapper.findComponent(CheckboxStub);
    expect(channel.text()).toBe("DE (de)");
    expect(channel.props("modelValue")).toBe(false);
    await channel.vm.$emit("update:modelValue", true);
    expect(wrapper.vm.selectedChannels).toEqual({ de: { inherit: true } });

    const inherit = wrapper.findAllComponents(CheckboxStub)[1];
    expect(inherit.props("modelValue")).toBe(true);
    await inherit.vm.$emit("update:modelValue", false);
    expect(wrapper.vm.selectedChannels).toEqual({ de: { inherit: false } });

    await channel.vm.$emit("update:modelValue", false);
    expect(wrapper.vm.selectedChannels).toEqual({});
  });
});
