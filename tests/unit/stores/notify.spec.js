/**
 * cms-error-handling-global — spawnNotification must never render an empty toast:
 * empty msg + empty title falls back to the localized notifications.error, and a
 * ref/computed passed as msg is unwrapped (a ComputedRef is always truthy, which
 * used to defeat `|| $t(...)` fallbacks in views).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { ref } from "vue";
import { useNotifyStore } from "@/stores/notify.js";

describe("notify.spawnNotification empty-msg guard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("falls back to the localized error message when msg and title are empty", () => {
    const store = useNotifyStore();
    store.spawnNotification({ type: "negative" });
    expect(store.notifications[0].msg).toBe("Something went wrong");
  });

  it("keeps msg empty for a title-only toast", () => {
    const store = useNotifyStore();
    store.spawnNotification({ title: "Saved" });
    expect(store.notifications[0].msg).toBe("");
    expect(store.notifications[0].title).toBe("Saved");
  });

  it("unwraps a ref passed as msg and still guards emptiness", () => {
    const store = useNotifyStore();
    store.spawnNotification({ msg: ref("") });
    expect(store.notifications[0].msg).toBe("Something went wrong");
  });

  it("passes a non-empty msg through untouched", () => {
    const store = useNotifyStore();
    store.spawnNotification({ msg: "Product saved", type: "positive" });
    expect(store.notifications[0].msg).toBe("Product saved");
  });
});
