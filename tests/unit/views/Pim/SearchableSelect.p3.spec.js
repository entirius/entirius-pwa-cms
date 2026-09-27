import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import SearchableSelect from "@/views/Pim/components/SearchableSelect.vue";

const SelectStub = { name: "BasicSelect", props: ["modelValue", "options", "placeholder"], emits: ["update:modelValue"], template: "<div />" };

const mountSelect = (selected = null) =>
  mount(SearchableSelect, {
    props: {
      options: [{ label: "Red", value: "red" }],
      selected,
      featureIdx: "color",
      channelIdx: "default-europe",
      optionCount: 1,
      placeholder: "Pick a colour",
    },
    global: { components: { BasicSelect: SelectStub } },
  });

describe("SearchableSelect — short list (P3)", () => {
  it("shows the placeholder while empty and emits the picked value", async () => {
    const wrapper = mountSelect();
    const select = wrapper.findComponent(SelectStub);
    expect(select.props("modelValue")).toBe("");

    await select.vm.$emit("update:modelValue", "red");
    expect(wrapper.emitted("update:selected")).toEqual([["red"]]);
  });

  it("the clear option emits null", async () => {
    const wrapper = mountSelect("red");
    const select = wrapper.findComponent(SelectStub);
    expect(select.props("modelValue")).toBe("red");

    await select.vm.$emit("update:modelValue", null);
    expect(wrapper.emitted("update:selected")).toEqual([[null]]);
  });
});
