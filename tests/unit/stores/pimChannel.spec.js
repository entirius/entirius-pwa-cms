/**
 * etap-12 #25 — pimChannel store persists the operator's last selection in
 * localStorage so a page reload (or new tab) doesn't bounce them back to the
 * env default.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

const STORAGE_KEY = "pim:lastSelectedChannel";

vi.mock("@/api/pim/api", () => ({
  GET_Channels: vi.fn().mockResolvedValue({ data: { results: [] } }),
}));

async function freshStore() {
  setActivePinia(createPinia());
  // Re-import after setting fresh pinia so the composition store sees a clean state.
  const mod = await import("@/stores/pimChannel.js");
  return mod.usePimChannelStore();
}

describe("etap-12 #25 — pimChannel localStorage persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it("falls back to env channel when storage is empty", async () => {
    const store = await freshStore();
    expect(store.activeChannelIdx).toBe(process.env.VUE_APP_CHANNEL || "");
  });

  it("setActiveChannel writes to localStorage", async () => {
    const store = await freshStore();
    store.setActiveChannel("eu");
    expect(store.activeChannelIdx).toBe("eu");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("eu");
  });

  it("rehydrates from localStorage on next mount", async () => {
    window.localStorage.setItem(STORAGE_KEY, "asia");
    const store = await freshStore();
    expect(store.activeChannelIdx).toBe("asia");
  });

  it("survives localStorage failures (private mode / blocked storage)", async () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });
    const store = await freshStore();
    // Must not throw.
    expect(() => store.setActiveChannel("eu")).not.toThrow();
    expect(store.activeChannelIdx).toBe("eu");
    window.localStorage.setItem = original;
  });
});
