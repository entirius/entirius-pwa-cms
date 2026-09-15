import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ThreadTimeline from "@/views/Leads/ThreadTimeline.vue";

const messages = [
  { kind: "reply", at: "2026-09-21T09:00:00Z", direction: "in", status: "", subject: "Re: audit", body_text: "Thanks" },
  { kind: "message", at: "2026-09-21T08:00:00Z", direction: "out", status: "sent", subject: "Audit", body_text: "Hello" },
  { kind: "message", at: "2026-09-24T08:00:00Z", direction: "out", status: "scheduled", subject: "Follow", body_text: "Ping" },
];
const activities = [{ created_at: "2026-09-21T08:30:00Z", message: "stage new -> contacted" }];

describe("ThreadTimeline", () => {
  it("merges messages and activity notes into one list sorted by time", () => {
    const wrapper = mount(ThreadTimeline, { props: { messages, activities } });
    const sides = wrapper.findAll(".tl__entry").map((li) => li.attributes("data-testid"));
    expect(sides).toEqual(["timeline-out", "timeline-note", "timeline-in", "timeline-out"]);
  });

  it("badges outbound status and tags later outbound messages as follow-ups", () => {
    const wrapper = mount(ThreadTimeline, { props: { messages } });
    expect(wrapper.find('[data-testid="status-sent"]').exists()).toBe(true);
    expect(wrapper.findAll(".tl__tag")).toHaveLength(1);
  });

  it("a scheduled message past the send beat says the send policy holds it", () => {
    const past = new Date(Date.now() - 6 * 60000).toISOString();
    const wrapper = mount(ThreadTimeline, { props: { messages: [{ ...messages[2], at: past }] } });
    expect(wrapper.get('[data-testid="status-scheduled"]').text()).toContain("leads.status.held");
  });

  it("the first outbound message of every merged thread is not a follow-up", () => {
    const merged = [
      { ...messages[1], thread: 1 },
      { ...messages[2], thread: 1 },
      { ...messages[1], at: "2026-09-25T08:00:00Z", subject: "New draft", thread: 2 },
    ];
    const wrapper = mount(ThreadTimeline, { props: { messages: merged } });
    expect(wrapper.findAll(".tl__tag")).toHaveLength(1);
  });

  it("offers opt-out confirmation on a suspected opt-out reply", async () => {
    const optouts = [{ id: 3, received_at: "2026-09-21T09:00:00Z", optout_confirmed_at: null }];
    const wrapper = mount(ThreadTimeline, { props: { messages, optouts } });
    await wrapper.get('[data-testid="confirm-optout"]').trigger("click");
    expect(wrapper.emitted("confirm-optout")[0]).toEqual([3]);
  });
});
