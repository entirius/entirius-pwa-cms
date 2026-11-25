import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const postProduct = vi.fn();
const postAddToChannel = vi.fn();
vi.mock("@/api/pim/api", () => ({
  POST_Product: (...args) => postProduct(...args),
  GET_FeatureSets: () => Promise.resolve({ data: { results: [{ idx: "outdoor", name: "Outdoor" }] } }),
  POST_AddToChannel: (...args) => postAddToChannel(...args),
}));
vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));
vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({
    activeChannelIdx: "pl",
    channels: [{ idx: "pl", name: "PL" }, { idx: "de", name: "DE" },
      { idx: "uk", name: "UK", inheritance_enabled: true, default_inheritance_flags: ["images", "descriptions"] }],
  }),
}));

import ProductCreate from "@/views/Pim/ProductCreate.vue";

const CheckboxStub = { name: "BasicCheckbox", props: ["modelValue"], emits: ["update:modelValue"], template: "<div><slot /></div>" };
const SelectStub = { name: "BasicSelect", props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<div />" };

const flagBox = (wrapper, label) => wrapper.findAllComponents(CheckboxStub).find((box) => box.text() === label);
const flagStates = (wrapper) => Object.fromEntries(["images", "attributes", "descriptions"]
  .map((flag) => [flag, flagBox(wrapper, `pim.inherit_${flag}`).props("modelValue")]));

beforeEach(() => {
  postProduct.mockReset();
  postAddToChannel.mockReset();
});

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

  it("a channel without inheritance adds the channel with no flags and shows no flag checkboxes", async () => {
    const wrapper = mountCreate();
    await flushPromises();

    const channel = wrapper.findComponent(CheckboxStub);
    expect(channel.text()).toBe("DE (de)");
    expect(channel.props("modelValue")).toBe(false);
    await channel.vm.$emit("update:modelValue", true);
    expect(wrapper.vm.selectedChannels).toEqual({ de: { flags: [] } });
    expect(wrapper.findAllComponents(CheckboxStub)).toHaveLength(2);

    await channel.vm.$emit("update:modelValue", false);
    expect(wrapper.vm.selectedChannels).toEqual({});
  });

  it("a channel with inheritance shows the three flags, pre-ticked from its defaults", async () => {
    const wrapper = mountCreate();
    await flushPromises();

    await flagBox(wrapper, "UK (uk)").vm.$emit("update:modelValue", true);
    expect(wrapper.vm.selectedChannels).toEqual({ uk: { flags: ["images", "descriptions"] } });
    expect(flagStates(wrapper)).toEqual({ images: true, attributes: false, descriptions: true });

    await flagBox(wrapper, "pim.inherit_attributes").vm.$emit("update:modelValue", true);
    await flagBox(wrapper, "pim.inherit_images").vm.$emit("update:modelValue", false);
    expect(flagStates(wrapper)).toEqual({ images: false, attributes: true, descriptions: true });
  });
});

describe("ProductCreate — also add to channels", () => {
  beforeEach(() => {
    postProduct.mockResolvedValue({ data: { sku: "CHAIR-1" } });
    postAddToChannel.mockResolvedValue({ data: {} });
  });

  async function createWith(channelLabels, flagEdits = {}) {
    const wrapper = mountCreate();
    await flushPromises();
    for (const label of channelLabels) await flagBox(wrapper, label).vm.$emit("update:modelValue", true);
    for (const [label, on] of Object.entries(flagEdits)) await flagBox(wrapper, label).vm.$emit("update:modelValue", on);
    Object.assign(wrapper.vm.form, { sku: "CHAIR-1", feature_set_idx: "outdoor" });
    await flushPromises();
    await wrapper.vm.createProduct();
    await flushPromises();
    return wrapper;
  }

  it("sends the channel's default inherit flags, no content copy when values are inherited", async () => {
    await createWith(["UK (uk)"]);

    expect(postAddToChannel).toHaveBeenCalledWith("pl", "CHAIR-1", {
      target_channel_idx: "uk", copy_content: false,
      inherit_images: true, inherit_attributes: false, inherit_descriptions: true,
    });
  });

  it("sends the ticked flags; images only still copies the content", async () => {
    await createWith(["UK (uk)"], { "pim.inherit_descriptions": false });

    expect(postAddToChannel).toHaveBeenCalledWith("pl", "CHAIR-1", {
      target_channel_idx: "uk", copy_content: true,
      inherit_images: true, inherit_attributes: false, inherit_descriptions: false,
    });
  });

  it("a channel without inheritance copies the content with every flag off", async () => {
    await createWith(["DE (de)"]);

    expect(postAddToChannel).toHaveBeenCalledWith("pl", "CHAIR-1", {
      target_channel_idx: "de", copy_content: true,
      inherit_images: false, inherit_attributes: false, inherit_descriptions: false,
    });
    expect(postAddToChannel.mock.calls[0][2]).not.toHaveProperty("inherit");
  });
});

describe("ProductCreate — formats (plan 61)", () => {
  it("an EAN with a wrong check digit blocks the create with a field error, no request", async () => {
    const wrapper = mountCreate();
    await flushPromises();
    Object.assign(wrapper.vm.form, { sku: "CHAIR-1", feature_set_idx: "outdoor", ean: "5901234123458" });
    await flushPromises(); // the form watcher clears errors: let it run before the save, as typing does
    await wrapper.vm.createProduct();
    expect(postProduct).not.toHaveBeenCalled();
    expect(wrapper.vm.formErrors.getFieldError("ean").msg).toMatch(/check digit/);
  });

  it("a SKU with a space blocks the create", async () => {
    const wrapper = mountCreate();
    await flushPromises();
    Object.assign(wrapper.vm.form, { sku: "CHAIR 1", feature_set_idx: "outdoor", ean: "" });
    await flushPromises(); // the form watcher clears errors: let it run before the save, as typing does
    await wrapper.vm.createProduct();
    expect(postProduct).not.toHaveBeenCalled();
    expect(wrapper.vm.formErrors.getFieldError("sku").msg).toMatch(/without spaces/);
  });

  it("the EAN placeholder comes from i18n, not a hard-coded English example", async () => {
    const wrapper = mountCreate();
    await flushPromises();

    const ean = wrapper.findAllComponents({ name: "BasicInput" }).find((input) => input.attributes("format") === "ean");
    expect(ean.attributes("placeholder")).toBe("pim.ean_placeholder");
  });
});
