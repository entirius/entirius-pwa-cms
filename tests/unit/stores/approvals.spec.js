import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

const api = vi.hoisted(() => ({ GET_Approvals: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);

import { useApprovalsStore } from "@/stores/approvals";
import { navTree } from "@/composables/useNav";

describe("approvals count (the nav badge)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
    api.GET_Approvals.mockResolvedValue({ data: { count: 3, counts: { total: 7 }, results: [] } });
  });
  afterEach(() => vi.useRealTimers());

  it("asks for one row and keeps the total of the whole set", async () => {
    const store = useApprovalsStore();
    await store.refresh();
    expect(api.GET_Approvals).toHaveBeenCalledWith({ page_size: 1 });
    expect(store.total).toBe(7);
  });

  it("polls while started; stop resets the number and drops a late answer", async () => {
    const store = useApprovalsStore();
    store.start();
    await vi.advanceTimersByTimeAsync(30000);
    expect(api.GET_Approvals).toHaveBeenCalledTimes(2);
    let release;
    api.GET_Approvals.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const pending = store.refresh();
    store.stop();
    release({ data: { counts: { total: 9 } } });
    await pending;
    expect(store.total).toBe(0);
    await vi.advanceTimersByTimeAsync(60000);
    expect(api.GET_Approvals).toHaveBeenCalledTimes(3);
  });

  it("a failed read keeps the last number", async () => {
    const store = useApprovalsStore();
    await store.refresh();
    api.GET_Approvals.mockRejectedValue(new Error("down"));
    await store.refresh();
    expect(store.total).toBe(7);
  });

  it("the Approvals nav entry carries the count", () => {
    const ctx = { isModuleEnabled: () => true, isDesktop: true, canRead: () => true, counts: { approvals: 5 } };
    const entry = navTree(ctx).leads.find((item) => item.route === "/leads/approvals");
    expect(entry.count).toBe(5);
  });
});
