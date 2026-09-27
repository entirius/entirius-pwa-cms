import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import NumberInput from "@/boots/NumberInput/index.vue";

const lastEmit = (wrapper) => wrapper.emitted("update:modelValue").at(-1)[0];

describe("NumberInput boot", () => {
  it("keeps integer entry for an integer step", async () => {
    const wrapper = mount(NumberInput, { props: { modelValue: "" } });
    await wrapper.find("input").setValue("8,5");
    expect(lastEmit(wrapper)).toBe("85");
  });

  it("takes a decimal with a comma or a dot for a fractional step", async () => {
    const wrapper = mount(NumberInput, { props: { modelValue: "", step: 0.01, max: 100 } });
    await wrapper.find("input").setValue("8,5");
    expect(lastEmit(wrapper)).toBe("8.5");
    await wrapper.setProps({ modelValue: "8." });
    expect(wrapper.find("input").element.value).toBe("8.");
  });

  it("steps and clamps to the step's decimal places", async () => {
    const wrapper = mount(NumberInput, { props: { modelValue: "23", step: 0.01, max: 100 } });
    const [minus, plus] = wrapper.findAll("button");
    await minus.trigger("click");
    expect(lastEmit(wrapper)).toBe("22.99");
    await wrapper.setProps({ modelValue: "99.995" });
    await plus.trigger("click");
    expect(lastEmit(wrapper)).toBe("100");
  });
});
