import { describe, it, expect, vi, afterEach } from "vitest";
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
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("an icon-prop button without text is icon-only and named by label", () => {
    const wrapper = mount(BasicButton, { props: { icon: "close-mini", label: "Close" } });
    expect(wrapper.classes()).toContain("button-basic--icon");
    expect(wrapper.find(".icon-close-mini").exists()).toBe(true);
    expect(wrapper.attributes("aria-label")).toBe("Close");
  });

  it("a text button with label shows the text and is named by the label", () => {
    const wrapper = mount(BasicButton, { props: { text: "Edit", label: "Edit product" } });
    expect(wrapper.classes()).not.toContain("button-basic--icon");
    expect(wrapper.text()).toBe("Edit");
    expect(wrapper.attributes("aria-label")).toBe("Edit product");
    expect(wrapper.attributes("title")).toBe("Edit product");
  });

  describe("accessible-name warning", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    it("warns for an icon-only button without label, still a square", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const wrapper = mount(BasicButton, { props: { custom: true }, slots: icon });
      expect(warn).toHaveBeenCalledOnce();
      expect(wrapper.classes()).toContain("button-basic--icon");
    });

    it("stays quiet for a named icon-only button and for a text button", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      mount(BasicButton, { props: { icon: "close-mini", label: "Close" } });
      mount(BasicButton, { props: { text: "Save" } });
      expect(warn).not.toHaveBeenCalled();
    });

    it("is silent in a production build", () => {
      vi.stubEnv("NODE_ENV", "production");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      mount(BasicButton, { props: { custom: true }, slots: icon });
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
