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
const spawnNotification = vi.hoisted(() => vi.fn());
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification }) }));

const GET_Company = vi.hoisted(() => vi.fn((id) => Promise.resolve({ data: { id, name: `Example Shop ${id}` } })));
vi.mock("@/api/leads/api", () => ({ GET_Company }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => key === "leads" }) }));

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

  it("a tab becoming visible polls at once", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const store = useNotificationsStore();
    store.start();
    await flushPromises();
    document.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();
    expect(api.GET_UnreadCount).toHaveBeenCalledTimes(2);
    store.stop();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(api.GET_UnreadCount).toHaveBeenCalledTimes(2);
    visibility.mockRestore();
  });

  it("a double tap on a row reads once and drops the badge by one", async () => {
    useNotificationsStore().unread = 2;
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    const row = wrapper.findAll('[data-testid="notif-row"]')[0];
    await row.trigger("click");
    await row.trigger("click");
    await flushPromises();
    expect(api.POST_MarkRead).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="notif-count"]').text()).toBe("1");
  });

  it("a failed read shows a toast and keeps the badge", async () => {
    api.POST_MarkRead.mockRejectedValueOnce({ error: "INTERNAL_ERROR" });
    useNotificationsStore().unread = 2;
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    await wrapper.findAll('[data-testid="notif-row"]')[0].trigger("click");
    await flushPromises();
    expect(spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "negative" }));
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="notif-count"]').text()).toBe("2");
  });

  it("a failing list load is caught and leaves the list empty", async () => {
    api.GET_Notifications.mockRejectedValueOnce({ error: "INTERNAL_ERROR" });
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    expect(wrapper.findAll('[data-testid="notif-row"]')).toHaveLength(0);
  });

  it("notification rows carry the company name (and the company for Possible opt-out), not the raw address", async () => {
    api.GET_Notifications.mockResolvedValueOnce({
      data: {
        results: [
          { id: 3, title: "Reply from anna@example-shop-5.test", severity: "medium", subject_ref: "leads.Company:5", created_at: "2026-09-14T08:00:00Z" },
          { id: 4, title: "Possible opt-out", severity: "medium", subject_ref: "leads.Company:6", created_at: "2026-09-14T08:01:00Z" },
        ],
      },
    });
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    const titles = wrapper.findAll(".notif-row__title").map((row) => row.text());
    expect(titles).toEqual(["Reply from Example Shop 5", "Possible opt-out · Example Shop 6"]);
  });

  // FIX-17c item 4: three replies from one company are three different rows — the reply's words and its day.
  it("rows with the same title differ by a preview of the body and a day-and-time", async () => {
    const reply = (id, body, created_at) => ({ id, title: "Reply from Example Shop 5", severity: "high", subject_ref: "leads.Company:5", body, created_at });
    api.GET_Notifications.mockResolvedValueOnce({
      data: {
        results: [
          reply(5, "Yes, call me tomorrow.\n\nOn Mon, 14 Sep 2026 Anna wrote:\n> Your shop audit", "2026-09-14T11:55:00Z"),
          reply(6, "Not interested", "2026-09-15T09:10:00Z"),
          reply(7, "", "2026-09-15T09:12:00Z"),
        ],
      },
    });
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="notif-row"]');
    expect(rows[0].get('[data-testid="notif-preview"]').text()).toBe("Yes, call me tomorrow.");
    expect(rows[1].get('[data-testid="notif-preview"]').text()).toBe("Not interested");
    expect(rows[2].find('[data-testid="notif-preview"]').exists()).toBe(false);
    expect(rows[0].get(".notif-row__age").text()).toMatch(/^14\.09 \d\d:55$/);
  });

  it("on desktop the bell opens an anchored popover that Escape closes", async () => {
    const wrapper = mountBell();
    await wrapper.get('[data-testid="notif-bell"]').trigger("click");
    await flushPromises();
    const style = wrapper.get('[data-testid="notif-sheet"]').attributes("style");
    expect(style).toContain("--notif-top");
    expect(style).toContain("--notif-right");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(wrapper.find('[data-testid="notif-sheet"]').exists()).toBe(false);
  });
});
