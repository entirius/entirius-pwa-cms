import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Switcher from "@/boots/Switcher/Switcher.vue";
import HelpTooltip from "@/boots/HelpTooltip/index.vue";

const mountSwitcher = (props = {}) => mount(Switcher, { props, global: { components: { HelpTooltip } } });

describe("Switcher boot", () => {
  it("exposes switch semantics and is reachable from the keyboard", () => {
    const root = mountSwitcher({ label: "Active", selected: true }).find(".switcher");
    expect(root.attributes("role")).toBe("switch");
    expect(root.attributes("aria-checked")).toBe("true");
    expect(root.attributes("aria-disabled")).toBe("false");
    expect(root.attributes("aria-label")).toBe("Active");
    expect(root.attributes("tabindex")).toBe("0");
  });

  it("drops out of the tab order and reports itself disabled when prevent is set", () => {
    const root = mountSwitcher({ label: "Active", prevent: true }).find(".switcher");
    expect(root.attributes("tabindex")).toBe("-1");
    expect(root.attributes("aria-disabled")).toBe("true");
  });

  it.each([
    ["a click", "click", {}],
    ["Enter", "keydown", { key: "Enter" }],
    ["Space", "keydown", { key: " " }],
  ])("emits onSelect on %s", async (_label, event, options) => {
    const wrapper = mountSwitcher({ label: "Active" });
    await wrapper.find(".switcher").trigger(event, options);
    expect(wrapper.emitted("onSelect")).toHaveLength(1);
  });

  it("swallows Enter and Space while prevent is set", async () => {
    const wrapper = mountSwitcher({ label: "Active", prevent: true });
    await wrapper.find(".switcher").trigger("keydown", { key: "Enter" });
    await wrapper.find(".switcher").trigger("keydown", { key: " " });
    expect(wrapper.emitted("onSelect")).toBeFalsy();
  });

  it("ignores keys that are not Enter or Space", async () => {
    const wrapper = mountSwitcher({ label: "Active" });
    await wrapper.find(".switcher").trigger("keydown", { key: "a" });
    await wrapper.find(".switcher").trigger("keydown", { key: "Tab" });
    expect(wrapper.emitted("onSelect")).toBeFalsy();
  });

  it("does not toggle when the hint tooltip is activated", async () => {
    const wrapper = mountSwitcher({ label: "Active", hint: "Explain" });
    const tooltip = wrapper.find(".help-tooltip");
    expect(tooltip.exists()).toBe(true);
    await tooltip.trigger("click");
    await tooltip.trigger("keydown", { key: "Enter" });
    await tooltip.trigger("keydown", { key: " " });
    expect(wrapper.emitted("onSelect")).toBeFalsy();
  });

  it("keeps a single element root so $el points at the switch", () => {
    const wrapper = mountSwitcher({ label: "Active" });
    expect(wrapper.vm.$el).toBe(wrapper.find(".switcher").element);
  });

  it("omits aria-label when there is no visible label", () => {
    const root = mountSwitcher().find(".switcher");
    expect(root.attributes("aria-label")).toBeUndefined();
  });
});
