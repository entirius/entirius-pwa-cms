import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ThreadTimeline from "@/views/Leads/ThreadTimeline.vue";

const messages = [
  { kind: "reply", at: "2026-09-21T09:00:00Z", direction: "in", status: "", subject: "Re: audit", body_text: "Thanks" },
  { kind: "message", at: "2026-09-21T08:00:00Z", direction: "out", status: "sent", subject: "Audit", body_text: "Hello" },
  { kind: "message", at: "2026-09-24T08:00:00Z", direction: "out", status: "scheduled", subject: "Follow", body_text: "Ping" },
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
    const waiting = [{ subject: "Follow", scheduled_at: slot }];
    const wrapper = mount(ThreadTimeline, { props: { messages: [messages[2]], waiting } });
    const time = new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    expect(wrapper.get('[data-testid="timeline-time"]').text()).toBe(time);
  });

  it("a scheduled message whose first send beat has passed says the send policy holds it", () => {
    const slot = new Date(Date.now() - 7 * 60000).toISOString();
    const waiting = [{ subject: "Follow", scheduled_at: slot }];
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
