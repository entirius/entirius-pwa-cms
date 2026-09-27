import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import { mount } from "@vue/test-utils";

import IconButton from "@/boots/IconButton/index.vue";

const mountButton = (props = {}, attrs = {}) =>
  mount(IconButton, { props: { icon: "delete", label: "Usuń", ...props }, attrs });

describe("IconButton", () => {
  it("draws the meaning's glyph and is named by label (aria-label and title)", () => {
    const wrapper = mountButton();
    expect(wrapper.find("font-awesome-icon-stub").attributes("icon")).toBe("trash-can");
    expect(wrapper.attributes("aria-label")).toBe("Usuń");
    expect(wrapper.attributes("title")).toBe("Usuń");
    expect(wrapper.attributes("type")).toBe("button");
  });

  it("is ghost md by default; variant and size are classes", () => {
    expect(mountButton().classes()).toEqual(expect.arrayContaining(["icon-button--ghost", "icon-button--md"]));
    expect(mountButton({ variant: "outline", size: "lg" }).classes()).toEqual(
      expect.arrayContaining(["icon-button--outline", "icon-button--lg"])
    );
  });

  it("aria-pressed only on a toggle", () => {
    expect(mountButton().attributes("aria-pressed")).toBeUndefined();
    expect(mountButton({ pressed: false }).attributes("aria-pressed")).toBe("false");
    expect(mountButton({ pressed: true }).attributes("aria-pressed")).toBe("true");
  });

  it("emits click unless disabled, and passes data-testid to the button", async () => {
    const wrapper = mountButton({}, { "data-testid": "row-delete" });
    expect(wrapper.attributes("data-testid")).toBe("row-delete");
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
    await wrapper.setProps({ disabled: true });
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("stops the click at the button unless :stop is false", async () => {
    const onParent = vi.fn();
    const Parent = {
      props: ["stop"],
      render() {
        return h("div", { onClick: onParent }, [h(IconButton, { icon: "edit", label: "Edytuj", stop: this.stop })]);
      },
    };
    await mount(Parent, { props: { stop: true } }).find("button").trigger("click");
    expect(onParent).not.toHaveBeenCalled();
    await mount(Parent, { props: { stop: false } }).find("button").trigger("click");
    expect(onParent).toHaveBeenCalledTimes(1);
  });

  it("rejects an icon that is no meaning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountButton({ icon: "trash-can" });
    const messages = warn.mock.calls.map(([message]) => message);
    expect(messages.some((m) => m.includes('custom validator check failed for prop "icon"'))).toBe(true);
    warn.mockRestore();
  });
});
