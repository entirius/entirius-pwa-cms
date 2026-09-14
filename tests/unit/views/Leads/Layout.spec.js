import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

const route = vi.hoisted(() => ({ name: "LeadsInbox" }));
vi.mock("vue-router", () => ({ useRoute: () => route }));

import Layout from "@/views/Leads/index.vue";

const mountLayout = () => mount(Layout, { global: { stubs: { Inbox: { template: "<div data-testid='inbox' />" }, RouterView: { template: "<div data-testid='detail' />" } } } });

describe("Leads layout", () => {
  it("on the inbox route renders only the inbox column", () => {
    route.name = "LeadsInbox";
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="inbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail"]').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain("leads--detail");
  });

  it("with a draft or thread open renders both columns and marks the detail state", () => {
    route.name = "LeadsReview";
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="inbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail"]').exists()).toBe(true);
    expect(wrapper.classes()).toContain("leads--detail");
  });
});
