import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { channelTimeZone, formatTime } from "@/utils/leadsTime";
import ThreadTimeline from "@/views/Leads/ThreadTimeline.vue";

const messages = [
  { kind: "reply", at: "2026-09-21T09:00:00Z", direction: "in", status: "", subject: "Re: audit", body_text: "Thanks" },
  { kind: "message", at: "2026-09-21T08:00:00Z", direction: "out", status: "sent", subject: "Audit", body_text: "Hello" },
  { kind: "message", message_id: 7, at: "2026-09-24T08:00:00Z", direction: "out", status: "scheduled", subject: "Follow", body_text: "Ping" },
];

describe("ThreadTimeline", () => {
  it("renders the thread's messages and replies in the order the API gives", () => {
    const wrapper = mount(ThreadTimeline, { props: { messages: [messages[1], messages[0], messages[2]] } });
    const sides = wrapper.findAll(".tl__entry").map((li) => li.attributes("data-testid"));
    expect(sides).toEqual(["timeline-out", "timeline-in", "timeline-out"]);
  });

  it("badges outbound status and tags later outbound messages as follow-ups", () => {
    const wrapper = mount(ThreadTimeline, { props: { messages: [messages[1], messages[0], messages[2]] } });
    expect(wrapper.find('[data-testid="status-sent"]').exists()).toBe(true);
    expect(wrapper.findAll(".tl__tag")).toHaveLength(1);
  });

  it("a waiting bubble shows its scheduled slot — the time the Send toast named", () => {
    const slot = "2026-09-24T09:04:30Z";
    const waiting = [{ id: 7, subject: "Follow", scheduled_at: slot }];
    const wrapper = mount(ThreadTimeline, { props: { messages: [messages[2]], waiting } });
    expect(wrapper.get('[data-testid="timeline-time"]').text()).toBe(formatTime(slot));
  });

  it("two waiting follow-ups with the same subject and created_at each show their own slot by message id", () => {
    const past = new Date(Date.now() - 7 * 60000).toISOString();
    const future = "2099-01-02T08:00:00Z";
    const first = { ...messages[2], message_id: 11 };
    const second = { ...messages[2], message_id: 12 };
    const waiting = [
      { id: 12, subject: "Follow", created_at: messages[2].at, scheduled_at: future },
      { id: 11, subject: "Follow", created_at: messages[2].at, scheduled_at: past },
    ];
    const wrapper = mount(ThreadTimeline, { props: { messages: [first, second], waiting } });
    const times = wrapper.findAll('[data-testid="timeline-time"]').map((node) => node.text());
    expect(times).toEqual([formatTime(past), formatTime(future)]);
    const statuses = wrapper.findAll('[data-testid="status-scheduled"]').map((node) => node.text().includes("leads.status.held"));
    expect(statuses).toEqual([true, false]);
  });

  it("a mail waiting for its window says scheduled for <day> <HH:MM>", () => {
    channelTimeZone.value = "UTC";
    const slot = "2099-01-02T08:00:00Z";
    const wrapper = mount(ThreadTimeline, { props: { messages: [messages[2]], waiting: [{ id: 7, subject: "Follow", scheduled_at: slot }] } });
    expect(wrapper.get('[data-testid="timeline-time"]').text()).toBe("02.01 08:00");
    expect(wrapper.get('[data-testid="status-scheduled"]').text()).not.toContain("leads.status.held");
    channelTimeZone.value = undefined;
  });

  it("a scheduled message whose first send beat has passed says the send policy holds it", () => {
    const slot = new Date(Date.now() - 7 * 60000).toISOString();
    const waiting = [{ id: 7, subject: "Follow", scheduled_at: slot }];
    const wrapper = mount(ThreadTimeline, { props: { messages: [messages[2]], waiting } });
    expect(wrapper.get('[data-testid="status-scheduled"]').text()).toContain("leads.status.held");
  });

  it("offers opt-out confirmation on a suspected opt-out reply", async () => {
    const optouts = [{ id: 3, received_at: "2026-09-21T09:00:00Z", optout_confirmed_at: null }];
    const wrapper = mount(ThreadTimeline, { props: { messages, optouts } });
    await wrapper.get('[data-testid="confirm-optout"]').trigger("click");
    expect(wrapper.emitted("confirm-optout")[0]).toEqual([3]);
  });
});
