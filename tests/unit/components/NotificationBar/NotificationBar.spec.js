import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";

const api = vi.hoisted(() => ({
  GET_UnreadCount: vi.fn(() => Promise.resolve({ data: { unread: 2 } })),
  GET_Notifications: vi.fn(() =>
    Promise.resolve({
      data: {
        results: [
          { id: 1, title: "Reply from Example Shop 1", severity: "high", subject_ref: "leads.Company:153", created_at: "2026-09-14T08:00:00Z" },
          { id: 2, title: "Budget", severity: "low", subject_ref: "toolbox:budget", created_at: "2026-09-14T08:01:00Z" },
        ],
      },
    })
  ),
  POST_MarkRead: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/notifications/api", () => api);
const push = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import { useNotificationsStore } from "@/stores/notifications";
import NotificationBell from "@/components/NotificationBar/NotificationBell.vue";

const mountBell = () => mount(NotificationBell, { global: { stubs: { teleport: true } } });

describe("notification bar", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("polls the unread count every 30 s and stops on logout", async () => {
    const store = useNotificationsStore();
    store.start();
    await flushPromises();
    expect(store.unread).toBe(2);
    vi.advanceTimersByTime(30000);
    expect(api.GET_UnreadCount).toHaveBeenCalledTimes(2);
    store.stop();
    vi.advanceTimersByTime(60000);
    expect(api.GET_UnreadCount).toHaveBeenCalledTimes(2);
    expect(store.unread).toBe(0);
  });

  it("skips polling while the tab is hidden", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await useNotificationsStore().poll();
    expect(api.GET_UnreadCount).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("shows the badge and opens the list", async () => {
    useNotificationsStore().unread = 2;
    const wrapper = mountBell();
    expect(wrapper.get('[data-testid="notif-count"]').text()).toBe("2");
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    expect(wrapper.findAll('[data-testid="notif-row"]')).toHaveLength(2);
  });

  it("opens as a bottom sheet that the backdrop closes", async () => {
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="notif-sheet"]').exists()).toBe(true);
    await wrapper.get('[data-testid="notif-backdrop"]').trigger("click");
    expect(wrapper.find('[data-testid="notif-sheet"]').exists()).toBe(false);
  });

  it("one tap on a row marks it read and jumps to the thread", async () => {
    useNotificationsStore().unread = 2;
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    await wrapper.findAll('[data-testid="notif-row"]')[0].trigger("click");
    await flushPromises();
    expect(api.POST_MarkRead).toHaveBeenCalledWith(1);
    expect(push).toHaveBeenCalledWith({ name: "LeadsThread", params: { id: 153 }, query: { tab: "timeline" } });
    expect(wrapper.get('[data-testid="notif-count"]').text()).toBe("1");
  });

  it("an unknown subject_ref is marked read without a jump", async () => {
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    await wrapper.findAll('[data-testid="notif-row"]')[1].trigger("click");
    await flushPromises();
    expect(api.POST_MarkRead).toHaveBeenCalledWith(2);
    expect(push).not.toHaveBeenCalled();
  });
});
