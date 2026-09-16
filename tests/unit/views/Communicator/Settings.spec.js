import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_Channel: vi.fn(),
  PATCH_Channel: vi.fn(),
  GET_Policy: vi.fn(),
  GET_WaitingMessages: vi.fn(),
  POST_SendNow: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import SettingsChannel from "@/views/Communicator/settings/SettingsChannel.vue";
import SettingsScheduled from "@/views/Communicator/settings/SettingsScheduled.vue";
import { t } from "@/i18n";
import { channelTimeZone } from "@/utils/leadsTime";

const stubs = {
  SegmentedControl: { props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<div />" },
};

describe("Communicator settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Channel.mockResolvedValue({ data: { mode: "dry_run", sandbox_mailbox: "", live_enabled: false } });
    api.GET_Policy.mockResolvedValue({ data: { timezone: "UTC", sent_today: 0, daily_cap: 10 } });
  });

  async function mountScheduled(waiting) {
    api.GET_WaitingMessages.mockResolvedValue(waiting);
    const wrapper = mount(SettingsScheduled);
    await flushPromises();
    return wrapper;
  }

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

  // FIX-17 item 10 + FIX-17a items 1-4: Send now only reschedules; the row then states what still holds the
  // mail (no clock that slides) and offers no second Send now, and the table scrolls inside its own box.
  it("send now only reschedules and the row states its send policy afterwards (C-31)", async () => {
    let row = { id: 5, subject: "S", status: "scheduled", scheduled_at: "2099-01-02T08:00:00Z", next_slot: "2099-01-02T08:00:00Z" };
    api.GET_WaitingMessages.mockImplementation(() => Promise.resolve([row]));
    api.POST_SendNow.mockImplementation(() => {
      row = { ...row, scheduled_at: "2020-01-01T10:00:00Z", next_slot: "2020-01-01T10:00:00Z" };
      return Promise.resolve({ data: { id: 5 } });
    });
    const wrapper = mount(SettingsScheduled);
    await flushPromises();
    expect(wrapper.find(".scheduled__scroll table.ld-table").exists()).toBe(true);
    await wrapper.find('[data-testid="scheduled-send-now"]').trigger("click");
    await flushPromises();
    expect(api.POST_SendNow).toHaveBeenCalledWith(5);
    expect(api.GET_WaitingMessages).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="scheduled-state"]').text()).toBe("due — waiting for the send run");
    expect(wrapper.find('[data-testid="scheduled-send-now"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="scheduled-asap"]').exists()).toBe(true);
  });

  // FIX-17a item 4: one column for the departure, read from the same `next_slot` the Inbox reads.
  it("a mail waiting for a future window names that window, and only that time", async () => {
    channelTimeZone.value = "UTC";
    const wrapper = await mountScheduled([
      { id: 9, subject: "S", status: "approved", scheduled_at: "2099-01-01T22:00:00Z", next_slot: "2099-01-02T08:00:00Z" },
    ]);
    expect(wrapper.get('[data-testid="scheduled-state"]').text()).toBe("goes out at 02.01 08:00");
    expect(wrapper.get('[data-testid="scheduled-row"]').text()).not.toContain("22:00");
    channelTimeZone.value = undefined;
  });

  // FIX-17a item 5: a draft without a company name still names who it goes to, never an internal code alone.
  it("the company column falls back to the recipient", async () => {
    const wrapper = await mountScheduled([
      { id: 9, subject: "S", status: "approved", next_slot: "2099-01-02T08:00:00Z", thread: { recipient_email: "jan@shop.test" } },
    ]);
    expect(wrapper.get('[data-testid="scheduled-row"]').text()).toContain("jan@shop.test");
  });

  // FIX-17 item 11: the table tells two mails to the same company apart, in Leads time format.
  it("a waiting row names the company and the recipient and reads DD.MM HH:MM", async () => {
    channelTimeZone.value = "UTC";
    const wrapper = await mountScheduled([
      {
        id: 7,
        subject: "Re: Example Shop 5",
        status: "approved",
        scheduled_at: "2099-01-02T08:00:00Z",
        next_slot: "2099-01-02T08:00:00Z",
        thread: { recipient_email: "anna@example-shop-5.test" },
        render_context: { company_name: "Example Shop 5" },
      },
    ]);
    const row = wrapper.get('[data-testid="scheduled-row"]');
    expect(row.text()).toContain("Example Shop 5");
    expect(row.get('[data-testid="scheduled-recipient"]').text()).toBe("anna@example-shop-5.test");
    expect(row.text()).toContain("02.01 08:00");
    expect(row.text()).not.toMatch(/AM|PM|\d{1,2}\/\d{1,2}\/\d{4}/);
    channelTimeZone.value = undefined;
  });

  // FIX-17 item 12: no jargon on the channel-mode card.
  it("channel mode reads as words, never dry_run or live_enabled or Grappelli", async () => {
    const wrapper = await mountChannel();
    const modes = wrapper.findComponent(stubs.SegmentedControl).props("options").map((option) => option.label);
    expect(modes).toEqual(["Test only", "Sandbox", "Live"]);
    expect(wrapper.get('[data-testid="channel-live-enabled"]').text()).toBe("communicator.channel.live_enabled_off");
    for (const key of ["communicator.channel.live_enabled_off", "communicator.channel.live_enabled_on"]) {
      expect(t(key)).not.toMatch(/Grappelli|live_enabled|✗/);
    }
  });
});
