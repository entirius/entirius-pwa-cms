import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import BasicMenu from "@/boots/BasicMenu/index.vue";

const ITEMS = [
  { key: "edit", label: "Edytuj", icon: "edit" },
  { key: "duplicate", label: "Duplikuj", icon: "duplicate", disabled: true },
  { key: "sep", separator: true },
  { key: "delete", label: "Usuń", icon: "delete", danger: true },
];
const key = (target, name) => target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));

describe("BasicMenu", () => {
  const wrappers = [];
  const mountMenu = (props = {}, slots = {}) => {
    const wrapper = mount(BasicMenu, {
      props: { items: ITEMS, label: "Akcje strony", ...props },
      slots: { trigger: "<button class='trigger'>Więcej</button>", ...slots },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  };
  const trigger = () => document.querySelector(".trigger");
  const menu = () => document.querySelector('[role="menu"], [role="dialog"]');
  const items = () => [...document.querySelectorAll('[role="menuitem"]')];
  const open = async () => {
    trigger().click();
    await nextTick();
    await nextTick();
  };

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = "";
  });

  it("sets the trigger's aria-haspopup / aria-expanded / aria-controls and toggles on its click", async () => {
    mountMenu();
    await nextTick();
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-controls")).toBe(menu().id);
    await open();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(menu().style.display).not.toBe("none");
    expect(menu().getAttribute("aria-label")).toBe("Akcje strony");
    trigger().click();
    await nextTick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("renders menuitems with icons, a separator and a danger item; focus starts on the first", async () => {
    mountMenu();
    await open();
    expect(items().map((item) => item.textContent.trim())).toEqual(["Edytuj", "Duplikuj", "Usuń"]);
    expect(document.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(items()[2].classList).toContain("basic-menu__item--danger");
    expect(items()[1].getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(items()[0]);
  });

  it("arrows skip the disabled item and wrap; Home / End jump", async () => {
    mountMenu();
    await open();
    key(document.activeElement, "ArrowDown");
    expect(document.activeElement).toBe(items()[2]);
    key(document.activeElement, "ArrowDown");
    expect(document.activeElement).toBe(items()[0]);
    key(document.activeElement, "ArrowUp");
    expect(document.activeElement).toBe(items()[2]);
    key(document.activeElement, "Home");
    expect(document.activeElement).toBe(items()[0]);
    key(document.activeElement, "End");
    expect(document.activeElement).toBe(items()[2]);
  });

  it("choosing emits select and closes with focus back on the trigger; a disabled item does nothing", async () => {
    const wrapper = mountMenu();
    await open();
    items()[1].click();
    expect(wrapper.emitted("select")).toBeUndefined();
    items()[2].click();
    await nextTick();
    expect(wrapper.emitted("select")[0][0].key).toBe("delete");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  it("Esc closes and returns focus; a click outside closes; ArrowDown on the trigger opens", async () => {
    mountMenu();
    await open();
    key(document.activeElement, "Escape");
    await nextTick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());

    key(trigger(), "ArrowDown");
    await nextTick();
    await nextTick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await nextTick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("the panel slot is a dialog named by label, focus on its first control", async () => {
    mountMenu({ items: [] }, { panel: "<p>Powiadomienia</p><button class='mark'>Oznacz</button>" });
    await nextTick();
    expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
    await open();
    expect(menu().getAttribute("role")).toBe("dialog");
    expect(document.activeElement).toBe(document.querySelector(".mark"));
  });

  it("inline: open in the page flow, a click on the trigger does not close it", async () => {
    mountMenu({ inline: true });
    await nextTick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    trigger().click();
    await nextTick();
    expect(menu().style.display).not.toBe("none");
    expect(menu().style.position).toBe("");
  });
});
