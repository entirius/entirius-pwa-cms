import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetFeatureAttributes = vi.fn();
const mockNotify = vi.fn();

vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: mockNotify }) }));

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

async function openSelect(wrapper, multiple) {
  await selectOf(wrapper, multiple).trigger("focusin");
  await flushPromises();
}

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
    await openSelect(wrapper, false);

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
    await openSelect(wrapper, true);

    const select = selectOf(wrapper, true);
    await select.vm.$emit("update:modelValue", ["s", "m"]);

    expect(lastRow(wrapper, "sizes").attribute_idxs).toEqual(["s", "m"]);
  });
});

describe("AttributeEditor — select values load lazily", () => {
  const optionValues = (wrapper, multiple) => selectOf(wrapper, multiple).props("options").map((o) => o.value);
  const moreOption = (wrapper, multiple) => selectOf(wrapper, multiple).props("options").at(-1);

  beforeEach(() => {
    mockGetFeatureAttributes.mockReset();
    mockNotify.mockReset();
  });

  it("opening a product asks for no values; a select loads its first page when it opens, once", async () => {
    mockGetFeatureAttributes.mockImplementation(() => page([{ idx: "red", name: "Red" }]));
    const wrapper = mountEditor();
    await flushPromises();
    expect(mockGetFeatureAttributes).not.toHaveBeenCalled();

    await openSelect(wrapper, false);
    await openSelect(wrapper, false);
    expect(mockGetFeatureAttributes).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureAttributes).toHaveBeenCalledWith("colour", "default-europe", { page_size: 100, page: 1 });
    expect(optionValues(wrapper, false)).toEqual(["red"]);
  });

  it("the selects that hold a value load their first page at once, in parallel, for the label", async () => {
    mockGetFeatureAttributes.mockImplementation(() => new Promise(() => {}));
    mountEditor([
      { feature_idx: "colour", attribute_idx: "red" },
      { feature_idx: "sizes", attribute_idx: "s" },
    ]);
    await flushPromises();
    expect(mockGetFeatureAttributes.mock.calls.map((call) => call[0])).toEqual(["colour", "sizes"]);
  });

  it("further pages load on demand through the last option, and a stored value outside them still shows", async () => {
    mockGetFeatureAttributes.mockImplementation((idx, channel, params) =>
      params.page === 1 ? page([{ idx: "red", name: "Red" }], "next-url") : page([{ idx: "blue", name: "Blue" }])
    );
    const wrapper = mountEditor([{ feature_idx: "colour", attribute_idx: "legacy" }]);
    await flushPromises();
    const more = moreOption(wrapper, false);
    expect(optionValues(wrapper, false)).toEqual(["red", "legacy", more.value]);

    await selectOf(wrapper, false).vm.$emit("update:modelValue", more.value);
    await flushPromises();
    expect(mockGetFeatureAttributes).toHaveBeenLastCalledWith("colour", "default-europe", { page_size: 100, page: 2 });
    expect(optionValues(wrapper, false)).toEqual(["red", "blue", "legacy"]);
    expect(wrapper.emitted("update:attributes")).toBeUndefined();
  });

  it("the last option of a multiselect loads the next page without touching the picked list", async () => {
    mockGetFeatureAttributes.mockImplementation((idx, channel, params) =>
      params.page === 1 ? page([{ idx: "s", name: "S" }], "next-url") : page([{ idx: "m", name: "M" }])
    );
    const wrapper = mountEditor([{ feature_idx: "sizes", attribute_idx: "s" }]);
    await flushPromises();

    await selectOf(wrapper, true).vm.$emit("update:modelValue", ["s", moreOption(wrapper, true).value]);
    await flushPromises();
    expect(optionValues(wrapper, true)).toEqual(["s", "m"]);
    expect(wrapper.emitted("update:attributes")).toBeUndefined();
  });

  it("a failed first page shows a notice and is asked again on the next open", async () => {
    mockGetFeatureAttributes.mockRejectedValueOnce(new Error("boom"));
    mockGetFeatureAttributes.mockImplementation(() => page([{ idx: "red", name: "Red" }]));
    const wrapper = mountEditor();
    await flushPromises();

    await openSelect(wrapper, false);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: "negative" }));
    expect(optionValues(wrapper, false)).toEqual([]);
    await openSelect(wrapper, false);
    expect(optionValues(wrapper, false)).toEqual(["red"]);
  });

  it("a failed later page keeps the values that arrived and the next-page option, which asks again", async () => {
    mockGetFeatureAttributes
      .mockImplementationOnce(() => page([{ idx: "red", name: "Red" }], "next-url"))
      .mockImplementationOnce(() => Promise.reject(new Error("boom")))
      .mockImplementation(() => page([{ idx: "blue", name: "Blue" }]));
    const wrapper = mountEditor();
    await flushPromises();
    await openSelect(wrapper, false);

    await selectOf(wrapper, false).vm.$emit("update:modelValue", moreOption(wrapper, false).value);
    await flushPromises();
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(optionValues(wrapper, false)).toEqual(["red", moreOption(wrapper, false).value]);

    await selectOf(wrapper, false).vm.$emit("update:modelValue", moreOption(wrapper, false).value);
    await flushPromises();
    expect(optionValues(wrapper, false)).toEqual(["red", "blue"]);
  });
});
