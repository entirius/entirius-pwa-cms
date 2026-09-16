import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useLeadsReviewStore } from "@/stores/leadsReview";

const route = vi.hoisted(() => ({ name: "LeadsInbox" }));
vi.mock("vue-router", () => ({ useRoute: () => route }));
const modules = vi.hoisted(() => new Set());
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => modules.has(key) }) }));

const GET_Policy = vi.hoisted(() => vi.fn(() => Promise.resolve({ data: { timezone: "Europe/Warsaw" } })));
vi.mock("@/api/communicator/api", () => ({ GET_Policy }));

import Layout from "@/views/Leads/index.vue";

const mountLayout = () => mount(Layout, { global: { stubs: { Inbox: { template: "<div data-testid='inbox' />" }, RouterView: { template: "<div data-testid='detail' />" } } } });
const enable = (...keys) => keys.forEach((key) => modules.add(key));

describe("Leads layout", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    modules.clear();
  });

  it("on the inbox route renders only the inbox column", () => {
    enable("leads", "communicator", "notifications");
    route.name = "LeadsInbox";
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="inbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail"]').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain("leads--detail");
  });

  // FIX-17 item 8: nothing to pick, no "Pick a draft to review" — the empty state of the Inbox says it once.
  it("the desktop placeholder appears only while drafts wait", () => {
    enable("leads", "communicator");
    route.name = "LeadsInbox";
    expect(mountLayout().find(".leads__placeholder").exists()).toBe(false);
    useLeadsReviewStore().setCount(2);
    expect(mountLayout().find(".leads__placeholder").exists()).toBe(true);
  });

  it("leads + communicator: a draft or thread open renders both columns and marks the detail state", () => {
    enable("leads", "communicator", "notifications");
    route.name = "LeadsReview";
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="inbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail"]').exists()).toBe(true);
    expect(wrapper.classes()).toContain("leads--detail");
  });

  it("leads-only: the company thread takes the whole width and no Inbox mounts", () => {
    enable("leads", "notifications");
    route.name = "LeadsThread";
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="inbox"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="detail"]').exists()).toBe(true);
    expect(wrapper.classes()).toContain("leads--solo");
  });

  it("notifications-absent: leads + communicator still render the inbox and the detail", () => {
    enable("leads", "communicator");
    route.name = "LeadsThread";
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="inbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail"]').exists()).toBe(true);
  });
});
