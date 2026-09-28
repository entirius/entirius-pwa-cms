import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import BasicTooltip from "@/boots/BasicTooltip/index.vue";

describe("BasicTooltip", () => {
  const wrappers = [];
  const mountTip = (props = {}, slot = "<button class='control'>Zapisz</button>") => {
    const wrapper = mount(BasicTooltip, {
      props: { text: "Najpierw wybierz kraje", ...props },
      slots: { default: slot },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  };
  const bubble = (wrapper) => wrapper.find('[role="tooltip"]');

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = "";
  });

  it("wraps its slot: the first focusable gets aria-describedby, the tip is hidden", async () => {
    const wrapper = mountTip();
    await nextTick();
    expect(wrapper.find(".control").attributes("aria-describedby")).toBe(bubble(wrapper).attributes("id"));
    expect(bubble(wrapper).isVisible()).toBe(false);
    expect(wrapper.attributes("tabindex")).toBeUndefined();
  });

  it("appends its id to the trigger's own aria-describedby", async () => {
    const wrapper = mountTip({}, "<button class='control' aria-describedby='hint'>Zapisz</button>");
    await nextTick();
    const id = bubble(wrapper).attributes("id");
    expect(wrapper.find(".control").attributes("aria-describedby")).toBe(`hint ${id}`);
  });

  it("re-evaluates on a text change: a tip equal to the trigger's name drops its id, a different one adds it", async () => {
    const wrapper = mountTip({ text: "Save" }, "<button class='control' aria-label='Save'>x</button>");
    await nextTick();
    expect(wrapper.find(".control").attributes("aria-describedby")).toBeUndefined();
    await wrapper.setProps({ text: "Save the draft first" });
    expect(wrapper.find(".control").attributes("aria-describedby")).toBe(bubble(wrapper).attributes("id"));
    await wrapper.setProps({ text: "Save" });
    expect(wrapper.find(".control").attributes("aria-describedby")).toBeUndefined();
  });

  it("shows on hover, hides on leave", async () => {
    const wrapper = mountTip();
    await wrapper.trigger("mouseenter");
    expect(bubble(wrapper).isVisible()).toBe(true);
    await wrapper.trigger("mouseleave");
    expect(bubble(wrapper).isVisible()).toBe(false);
  });

  it("shows on keyboard focus, hides on Esc and on blur", async () => {
    const wrapper = mountTip();
    const control = wrapper.find(".control").element;
    control.focus();
    await nextTick();
    expect(bubble(wrapper).isVisible()).toBe(true);
    await wrapper.trigger("keydown", { key: "Escape" });
    expect(bubble(wrapper).isVisible()).toBe(false);
    control.blur();
    control.focus();
    await nextTick();
    expect(bubble(wrapper).isVisible()).toBe(true);
    control.blur();
    await nextTick();
    expect(bubble(wrapper).isVisible()).toBe(false);
  });

  it("help variant: a `?` button named „Pomoc”, described by the tip", async () => {
    const wrapper = mountTip({ variant: "help" }, "");
    const help = wrapper.find("button.basic-tooltip__help");
    expect(help.attributes("aria-label")).toBe("common.help");
    expect(help.attributes("aria-describedby")).toBe(bubble(wrapper).attributes("id"));
    expect(help.find("font-awesome-icon-stub").attributes("icon")).toBe("circle-question");
  });

  it("a disabled control alone (disabled with a reason): the wrapper is the tab stop", async () => {
    const wrapper = mountTip({}, "<button class='control' disabled>Zapisz</button>");
    await nextTick();
    expect(wrapper.attributes("tabindex")).toBe("0");
    expect(wrapper.attributes("aria-describedby")).toBe(bubble(wrapper).attributes("id"));
  });

  it("open forces it shown", () => {
    expect(bubble(mountTip({ open: true })).isVisible()).toBe(true);
  });
});
