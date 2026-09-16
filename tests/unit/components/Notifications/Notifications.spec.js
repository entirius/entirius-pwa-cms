import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { useNotifyStore } from "@/stores/notify";
import Notifications from "@/components/Notifications/Notifications.vue";

// FIX-17c item 6: a tap on a phone never pins the toast over the page — only a hovering mouse holds it.
describe("toasts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const showToast = () => {
    useNotifyStore().spawnNotification({ msg: "That draft is already scheduled or sent.", type: "warning" });
    return mount(Notifications, { global: { stubs: { "transition-group": { template: "<ul><slot /></ul>" } } } });
  };

  it("a touch on the toast does not stop it from hiding", async () => {
    const wrapper = showToast();
    await wrapper.vm.$nextTick();
    await wrapper.get(".notification").trigger("pointerenter", { pointerType: "touch" });
    vi.advanceTimersByTime(5000);
    expect(useNotifyStore().notifications).toHaveLength(0);
  });

  it("a hovering mouse holds the toast until it leaves", async () => {
    const wrapper = showToast();
    await wrapper.vm.$nextTick();
    await wrapper.get(".notification").trigger("pointerenter", { pointerType: "mouse" });
    vi.advanceTimersByTime(10000);
    expect(useNotifyStore().notifications).toHaveLength(1);
    await wrapper.get(".notification").trigger("pointerleave", { pointerType: "mouse" });
    vi.advanceTimersByTime(5000);
    expect(useNotifyStore().notifications).toHaveLength(0);
  });
});
