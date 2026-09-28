/**
 * plan-33 review item — PageLayout's footer strip renders only when the footer slot has real content: a slot
 * whose only vnode is a v-if's Comment placeholder (e.g. `<Pagination v-if="pages > 1" />` on one page) leaves
 * no strip.
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PageLayout from "@/boots/PageLayout/index.vue";

describe("PageLayout footer", () => {
  it("hides the footer strip when the slot renders nothing (v-if false)", () => {
    const wrapper = mount(PageLayout, {
      slots: { footer: `<div v-if="false" class="pager" />` },
    });
    expect(wrapper.find(".page-layout__footer").exists()).toBe(false);
  });

  it("shows the footer strip when the slot renders something", () => {
    const wrapper = mount(PageLayout, {
      slots: { footer: `<div v-if="true" class="pager" />` },
    });
    expect(wrapper.find(".page-layout__footer").exists()).toBe(true);
    expect(wrapper.find(".pager").exists()).toBe(true);
  });

  it("has no footer strip when the footer slot is not used", () => {
    const wrapper = mount(PageLayout);
    expect(wrapper.find(".page-layout__footer").exists()).toBe(false);
  });
});
