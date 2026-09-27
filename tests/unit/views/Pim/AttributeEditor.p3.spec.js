import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/pim/api", () => ({
  GET_FeatureSetFeatures: () =>
    Promise.resolve({
      data: {
        results: [
          { feature_idx: "waterproof", feature_name: "Waterproof", feature_type: 1 },
          { feature_idx: "released", feature_name: "Released", feature_type: 10 },
        ],
      },
    }),
  GET_FeatureAttributes: () => Promise.resolve({ data: { results: [] } }),
}));

import AttributeEditor from "@/views/Pim/components/AttributeEditor.vue";

const SwitchStub = { name: "BasicSwitch", props: ["modelValue", "label"], emits: ["update:modelValue"], template: "<div />" };
const DateStub = { name: "BasicDatePicker", props: ["modelValue", "config"], emits: ["update:modelValue"], template: "<div />" };

const mountEditor = () =>
  mount(AttributeEditor, {
    props: { featureSetIdx: "outdoor", channelIdx: "default-europe", attributes: [] },
    global: {
      components: { BasicSwitch: SwitchStub, BasicDatePicker: DateStub },
      stubs: { RouterLink: true, TranslationsDrawer: true },
    },
  });

const lastRow = (wrapper, idx) =>
  wrapper.emitted("update:attributes").at(-1)[0].find((r) => r.feature_idx === idx);

describe("AttributeEditor — P3 controls", () => {
  it("the bool switch writes the picked value", async () => {
    const wrapper = mountEditor();
    await flushPromises();

    const toggle = wrapper.findComponent(SwitchStub);
    expect(toggle.props("modelValue")).toBe(false);
    await toggle.vm.$emit("update:modelValue", true);

    expect(lastRow(wrapper, "waterproof").value_bool).toBe(true);
  });

  it("a datetime attribute picks a single date", async () => {
    const wrapper = mountEditor();
    await flushPromises();

    const picker = wrapper.findComponent(DateStub);
    expect(picker.props("config").mode).toBe("single");
    await picker.vm.$emit("update:modelValue", "2026-09-27");

    expect(lastRow(wrapper, "released").value_datetime).toBe("2026-09-27");
  });
});
