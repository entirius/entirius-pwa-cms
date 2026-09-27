import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import BasicButton from "@/boots/BasicButton/index.vue";

const icon = { custom: '<svg class="fa-icon" />' };

describe("BasicButton", () => {
  it("is md by default and sm on request", () => {
    expect(mount(BasicButton, { props: { text: "Save" } }).classes()).toContain("button-basic--md");
    expect(mount(BasicButton, { props: { text: "Edit", size: "sm" } }).classes()).toContain("button-basic--sm");
  });

  it("a text button is not icon-only and carries no accessible-name attributes", () => {
    const wrapper = mount(BasicButton, { props: { text: "Save" } });
    expect(wrapper.classes()).not.toContain("button-basic--icon");
    expect(wrapper.attributes("aria-label")).toBeUndefined();
    expect(wrapper.text()).toBe("Save");
  });

  it("an icon-only button is a square named by label (aria-label and title)", () => {
    const wrapper = mount(BasicButton, { props: { custom: true, label: "Delete" }, slots: icon });
    expect(wrapper.classes()).toContain("button-basic--icon");
    expect(wrapper.attributes("aria-label")).toBe("Delete");
    expect(wrapper.attributes("title")).toBe("Delete");
    expect(wrapper.find(".fa-icon").exists()).toBe(true);
  });

  it("emits click unless disabled", async () => {
    const wrapper = mount(BasicButton, { props: { custom: true, label: "Delete" }, slots: icon });
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
    await wrapper.setProps({ isDisabled: true });
    expect(wrapper.attributes("disabled")).toBeDefined();
  });
});
