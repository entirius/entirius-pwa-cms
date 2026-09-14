import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Channel: vi.fn(), PATCH_Channel: vi.fn(), GET_Messages: vi.fn(), POST_SendNow: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import SettingsChannel from "@/views/Communicator/settings/SettingsChannel.vue";
import SettingsScheduled from "@/views/Communicator/settings/SettingsScheduled.vue";

const stubs = { SegmentedControl: { props: ["modelValue"], emits: ["update:modelValue"], template: "<div />" } };

describe("Communicator settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Channel.mockResolvedValue({ data: { mode: "dry_run", sandbox_mailbox: "", live_enabled: false } });
  });

  async function mountChannel() {
    const wrapper = mount(SettingsChannel, { global: { stubs } });
    await flushPromises();
    return wrapper;
  }

  it("sandbox without a mailbox is refused in the form (C-30)", async () => {
    const wrapper = await mountChannel();
    wrapper.findComponent(stubs.SegmentedControl).vm.$emit("update:modelValue", "sandbox");
    await wrapper.find("form").trigger("submit");
    expect(api.PATCH_Channel).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="channel-error"]').text()).toBe("Sandbox mode needs a sandbox mailbox");
  });

  it("shows the API refusal verbatim and never sends live_enabled", async () => {
    api.PATCH_Channel.mockRejectedValue({ response: { status: 409, data: { detail: "live mode needs live_enabled" } } });
    const wrapper = await mountChannel();
    wrapper.findComponent(stubs.SegmentedControl).vm.$emit("update:modelValue", "live");
    await flushPromises();
    expect(wrapper.find('[data-testid="channel-live-gate"]').text()).toBe("communicator.channel.live_gate");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(api.PATCH_Channel).toHaveBeenCalledWith({ mode: "live", sandbox_mailbox: "" });
    expect(wrapper.find('[data-testid="channel-error"]').text()).toBe("live mode needs live_enabled");
  });

  it("send now only reschedules and marks the row for the next beat (C-31)", async () => {
    api.GET_Messages.mockImplementation(({ status }) =>
      Promise.resolve({ data: { results: status === "scheduled" ? [{ id: 5, subject: "S", status, scheduled_at: null }] : [] } })
    );
    api.POST_SendNow.mockResolvedValue({ data: { id: 5, scheduled_at: "2026-09-15T10:00:00Z" } });
    const wrapper = mount(SettingsScheduled);
    await flushPromises();
    await wrapper.find('[data-testid="scheduled-send-now"]').trigger("click");
    await flushPromises();
    expect(api.POST_SendNow).toHaveBeenCalledWith(5);
    expect(wrapper.find('[data-testid="scheduled-next-beat"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="scheduled-send-now"]').exists()).toBe(false);
  });
});
