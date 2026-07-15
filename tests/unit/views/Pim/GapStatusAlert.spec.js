import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetStatus = vi.fn();
const mockRecompute = vi.fn();
const spawnNotification = vi.fn();

vi.mock("@/api/pim/api", () => ({
  GET_GapsStatus: (...a) => mockGetStatus(...a),
  POST_GapsRecompute: (...a) => mockRecompute(...a),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification }),
}));

import GapStatusAlert from "@/views/Pim/components/GapStatusAlert.vue";

const status = (over = {}) => ({
  data: {
    gaps_enabled: true,
    rules_changed_at: "2026-06-07T14:30:00+00:00",
    recomputed_at: "2026-06-07T10:00:00+00:00",
    is_stale: true,
    recompute_running: false,
    ...over,
  },
});

const mountAlert = () =>
  mount(GapStatusAlert, { global: { stubs: { FontAwesomeIcon: true, BasicButton: true } } });

describe("GapStatusAlert", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetStatus.mockReset();
    mockRecompute.mockReset();
    spawnNotification.mockReset();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("shows the banner only when the catalogue is stale", async () => {
    mockGetStatus.mockResolvedValueOnce(status({ is_stale: true }));
    const wrapper = mountAlert();
    await flushPromises();
    expect(wrapper.vm.isStale).toBe(true);
    expect(wrapper.find('[data-test="gap-status-alert"]').exists()).toBe(true);
  });

  it("hides the banner when nothing is stale", async () => {
    mockGetStatus.mockResolvedValueOnce(status({ is_stale: false }));
    const wrapper = mountAlert();
    await flushPromises();
    expect(wrapper.vm.isStale).toBe(false);
    expect(wrapper.find('[data-test="gap-status-alert"]').exists()).toBe(false);
  });

  it("soft-compat: a 404 status leaves no banner and does not throw", async () => {
    mockGetStatus.mockRejectedValueOnce({ response: { status: 404 } });
    const wrapper = mountAlert();
    await flushPromises();
    expect(wrapper.vm.status).toBe(null);
    expect(wrapper.find('[data-test="gap-status-alert"]').exists()).toBe(false);
  });

  it("'Recompute now' triggers the endpoint and starts polling", async () => {
    mockGetStatus.mockResolvedValueOnce(status({ is_stale: true }));
    mockRecompute.mockResolvedValueOnce({ data: { status: "started", running: true } });
    const wrapper = mountAlert();
    await flushPromises();

    await wrapper.vm.recompute();
    await flushPromises();

    expect(mockRecompute).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.recomputing).toBe(true);
    expect(spawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ msg: "pim.gaps_recompute_started" })
    );
  });

  it("already_running shows a warning and does not fire a second recompute", async () => {
    mockGetStatus.mockResolvedValueOnce(status({ is_stale: true }));
    mockRecompute.mockResolvedValueOnce({ data: { status: "already_running", running: true } });
    const wrapper = mountAlert();
    await flushPromises();

    await wrapper.vm.recompute();
    await flushPromises();

    expect(mockRecompute).toHaveBeenCalledTimes(1);
    expect(spawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning", msg: "pim.gaps_recompute_already_running" })
    );
  });

  it("polling clears the banner and reports success once the recompute settles", async () => {
    mockGetStatus.mockResolvedValueOnce(status({ is_stale: true }));
    mockRecompute.mockResolvedValueOnce({ data: { status: "started", running: true } });
    const wrapper = mountAlert();
    await flushPromises();

    await wrapper.vm.recompute();
    await flushPromises();

    // Next status poll: recompute finished and the catalogue is fresh.
    mockGetStatus.mockResolvedValueOnce(status({ is_stale: false, recompute_running: false }));
    await wrapper.vm.pollOnce();
    await flushPromises();

    expect(wrapper.vm.recomputing).toBe(false);
    expect(wrapper.vm.isStale).toBe(false);
    expect(wrapper.find('[data-test="gap-status-alert"]').exists()).toBe(false);
    expect(spawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "positive", msg: "pim.gaps_recompute_success" })
    );
  });
});
