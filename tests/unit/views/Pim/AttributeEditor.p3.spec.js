import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetFeatureAttributes = vi.fn();

vi.mock("@/api/pim/api", () => ({
  GET_FeatureSetFeatures: () =>
    Promise.resolve({
      data: {
        results: [
          { feature_idx: "waterproof", feature_name: "Waterproof", feature_type: 1 },
          { feature_idx: "released", feature_name: "Released", feature_type: 10 },
          { feature_idx: "colour", feature_name: "Colour", feature_type: 7 },
          { feature_idx: "sizes", feature_name: "Sizes", feature_type: 8 },
        ],
      },
    }),
  GET_FeatureAttributes: (...args) => mockGetFeatureAttributes(...args),
}));

import AttributeEditor from "@/views/Pim/components/AttributeEditor.vue";

const SwitchStub = { name: "BasicSwitch", props: ["modelValue", "label"], emits: ["update:modelValue"], template: "<div />" };
const DateStub = { name: "BasicDatePicker", props: ["modelValue", "config"], emits: ["update:modelValue"], template: "<div />" };
const SelectStub = {
  name: "BasicSelect",
  props: { modelValue: null, options: Array, multiple: Boolean, searchable: Boolean, clearable: Boolean },
  emits: ["update:modelValue"],
  template: "<div />",
};
const SlotStub = { template: "<div><slot name=\"actions\" /><slot /></div>" };

const page = (results, next = null) => Promise.resolve({ data: { results, next } });

const mountEditor = (attributes = []) =>
  mount(AttributeEditor, {
    props: { featureSetIdx: "outdoor", channelIdx: "default-europe", attributes },
    global: {
      components: { BasicSwitch: SwitchStub, BasicDatePicker: DateStub, BasicSelect: SelectStub },
      stubs: {
        RouterLink: true,
        TranslationsDrawer: true,
        IconButton: true,
        CountBadge: true,
        BasicCard: SlotStub,
        FormField: SlotStub,
      },
    },
  });

const selectOf = (wrapper, multiple) =>
  wrapper.findAllComponents(SelectStub).find((select) => select.props("multiple") === multiple);

const lastRow = (wrapper, idx) =>
  wrapper.emitted("update:attributes").at(-1)[0].find((r) => r.feature_idx === idx);

describe("AttributeEditor — P3 controls", () => {
  beforeEach(() => {
    mockGetFeatureAttributes.mockReset();
    mockGetFeatureAttributes.mockImplementation(() => page([]));
  });

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

  it("a select attribute is a searchable, clearable BasicSelect that writes the picked value", async () => {
    mockGetFeatureAttributes.mockImplementation((idx) =>
      page(idx === "colour" ? [{ idx: "red", name: "Red" }, { idx: "blue", name: "Blue" }] : [])
    );
    const wrapper = mountEditor();
    await flushPromises();

    const select = selectOf(wrapper, false);
    expect(select.props("searchable")).toBe(true);
    expect(select.props("clearable")).toBe(true);
    expect(select.props("options")).toEqual([
      { label: "Red", value: "red" },
      { label: "Blue", value: "blue" },
    ]);
    await select.vm.$emit("update:modelValue", "blue");
    expect(lastRow(wrapper, "colour").attribute_idx).toBe("blue");

    await select.vm.$emit("update:modelValue", null);
    expect(lastRow(wrapper, "colour").attribute_idx).toBe(null);
  });

  it("a multiselect attribute writes the picked list", async () => {
    mockGetFeatureAttributes.mockImplementation((idx) =>
      page(idx === "sizes" ? [{ idx: "s", name: "S" }, { idx: "m", name: "M" }] : [])
    );
    const wrapper = mountEditor();
    await flushPromises();

    const select = selectOf(wrapper, true);
    await select.vm.$emit("update:modelValue", ["s", "m"]);

    expect(lastRow(wrapper, "sizes").attribute_idxs).toEqual(["s", "m"]);
  });

  it("loads every page of a feature's values, and a stored value outside them still shows", async () => {
    mockGetFeatureAttributes.mockImplementation((idx, channel, params) => {
      if (idx !== "colour") return page([]);
      return params.page === 1 ? page([{ idx: "red", name: "Red" }], "next-url") : page([{ idx: "blue", name: "Blue" }]);
    });
    const wrapper = mountEditor([{ feature_idx: "colour", attribute_idx: "legacy" }]);
    await flushPromises();

    const values = selectOf(wrapper, false).props("options").map((option) => option.value);
    expect(values).toEqual(["red", "blue", "legacy"]);
    expect(mockGetFeatureAttributes).toHaveBeenCalledWith("colour", "default-europe", { page_size: 100, page: 2 });
  });
});
