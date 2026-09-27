import { describe, it, expect, vi, afterEach } from "vitest";
import { h } from "vue";
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

  it("stops the click at the button unless :stop is false", async () => {
    const onParent = vi.fn();
    const Parent = {
      props: ["stop"],
      render() {
        return h("div", { onClick: onParent }, [h(BasicButton, { text: "Go", stop: this.stop })]);
      },
    };
    await mount(Parent, { props: { stop: true } }).find("button").trigger("click");
    expect(onParent).not.toHaveBeenCalled();
    await mount(Parent, { props: { stop: false } }).find("button").trigger("click");
    expect(onParent).toHaveBeenCalledTimes(1);
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

  describe("variant API", () => {
    const button = (props, label = "Zapisz szkic") => mount(BasicButton, { props, slots: { default: label } });

    it("the variant is a class, the label the default slot, the type button", () => {
      const wrapper = button({ variant: "danger-solid" });
      expect(wrapper.classes()).toEqual(
        expect.arrayContaining(["button-basic--danger-solid", "button-basic--labelled"])
      );
      expect(wrapper.classes()).not.toContain("button-basic--icon");
      expect(wrapper.text()).toBe("Zapisz szkic");
      expect(wrapper.attributes("type")).toBe("button");
      expect(button({ variant: "primary", type: "submit" }).attributes("type")).toBe("submit");
    });

    it("a meaning icon renders before the label through FontAwesome", () => {
      const wrapper = button({ variant: "secondary", icon: "saveDraft" });
      const icon = wrapper.find(".btn-icon font-awesome-icon-stub");
      expect(icon.attributes("icon")).toBe("floppy-disk");
      expect(wrapper.find(".btn-icon").element.nextElementSibling.textContent).toBe("Zapisz szkic");
      expect(wrapper.find("i").exists()).toBe(false);
    });

    it("loading swaps the icon for a spinner, disables and sets aria-busy", async () => {
      const wrapper = button({ variant: "primary", icon: "publish", loading: true });
      expect(wrapper.find(".button-basic__spinner").exists()).toBe(true);
      expect(wrapper.find("font-awesome-icon-stub").exists()).toBe(false);
      expect(wrapper.attributes("disabled")).toBeDefined();
      expect(wrapper.attributes("aria-busy")).toBe("true");
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeUndefined();
    });

    it("disabled blocks the click; no aria-busy while idle", async () => {
      const wrapper = button({ variant: "ghost", disabled: true });
      expect(wrapper.attributes("disabled")).toBeDefined();
      expect(wrapper.attributes("aria-busy")).toBeUndefined();
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeUndefined();
    });
  });

  describe("transition API (removed in plan 19)", () => {
    it("without a variant the tag's role class paints and no variant class is added", () => {
      const wrapper = mount(BasicButton, { props: { text: "Save" }, attrs: { class: "btn-primary" } });
      expect(wrapper.classes()).toContain("btn-primary");
      expect(wrapper.classes().filter((c) => /^button-basic--(primary|secondary|ghost|danger)/.test(c))).toEqual([]);
    });

    it("isDisabled still disables", () => {
      expect(mount(BasicButton, { props: { text: "Save", isDisabled: true } }).attributes("disabled")).toBeDefined();
    });

    it("an icon that is no meaning keeps the legacy font glyph, so a text button sprouts nothing new", () => {
      const wrapper = mount(BasicButton, { props: { text: "Tłumacz", icon: "language" } });
      expect(wrapper.find("i.icon-language").exists()).toBe(true);
      expect(wrapper.find("font-awesome-icon-stub").exists()).toBe(false);
    });
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
