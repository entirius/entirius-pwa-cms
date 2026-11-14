import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const api = vi.hoisted(() => ({ GET_Replies: vi.fn() }));
vi.mock("@/api/communicator/api", () => ({ ...api, GET_ReplyClassPlans: () => Promise.resolve({ data: {} }), GET_WaitingMessages: () => Promise.resolve([]) }));
vi.mock("@/api/leads/api", () => ({ GET_Mailable: () => Promise.resolve({ data: { eligible: true, reasons: [] } }), POST_Compose: vi.fn() }));
const modules = vi.hoisted(() => ({ crm: false }));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isModuleAtLeast: () => modules.crm, isModuleEnabled: () => modules.crm }),
}));
import StatusBadge from "@/boots/StatusBadge/index.vue";
import { leadsFrame } from "./leadsFrame";
import { applyPolicy, channelTimeZone } from "@/utils/leadsTime";
import ThreadTimeline from "@/views/Leads/ThreadTimeline.vue";

const components = { StatusBadge, ConfirmDialog: leadsFrame.stubs.ConfirmDialog };
const stubs = { StatusBadge: false, ComposeDialog: { name: "ComposeDialog", props: ["open", "company", "reply"], template: "<div />" } };
const mountTl = (options) => mount(ThreadTimeline, { ...options, global: { components, stubs } });

const messages = [
  { kind: "reply", at: "2026-09-21T09:00:00Z", direction: "in", status: "", subject: "Re: audit", body_text: "Thanks" },
  { kind: "message", at: "2026-09-21T08:00:00Z", direction: "out", status: "sent", subject: "Audit", body_text: "Hello" },
  { kind: "message", message_id: 7, at: "2026-09-24T08:00:00Z", direction: "out", status: "scheduled", subject: "Follow", body_text: "Ping" },
];

// The views read the munin store (the outbound guards): an empty one = an older backend.
beforeEach(() => setActivePinia(createPinia()));

describe("ThreadTimeline", () => {
  it("renders the thread's messages and replies in the order the API gives", () => {
    const wrapper = mountTl({ props: { messages: [messages[1], messages[0], messages[2]] } });
    const sides = wrapper.findAll(".tl__entry").map((li) => li.attributes("data-testid"));
    expect(sides).toEqual(["timeline-out", "timeline-in", "timeline-out"]);
  });

  it("badges outbound status and tags later outbound messages as follow-ups", () => {
    const wrapper = mountTl({ props: { messages: [messages[1], messages[0], messages[2]] } });
    expect(wrapper.find('[data-testid="status-sent"]').exists()).toBe(true);
    expect(wrapper.findAll(".tl__tag")).toHaveLength(1);
  });

  // S2 (walk 3): a skipped or withdrawn draft is one closed line that opens to its text, never a bubble that looks sent.
  it("a skipped draft is one closed line with who skipped it; a withdrawn one names the reason", () => {
    const skipped = { ...messages[2], status: "rejected", rejected_by: "Maria Manager", reject_reason: "too early" };
    const withdrawn = { ...messages[2], status: "rejected", rejected_by: "", reject_reason: "the recipient opted out" };
    const wrapper = mountTl({ props: { messages: [messages[1], skipped, withdrawn] } });
    const lines = wrapper.findAll('[data-testid="timeline-skipped-line"]').map((node) => node.text());
    expect(lines[0]).toMatch(/^Draft skipped by Maria Manager · /);
    expect(lines[1]).toBe("Draft withdrawn · the recipient opted out");
    expect(wrapper.findAll(".tl__bubble")).toHaveLength(1);
    expect(wrapper.find('[data-testid="status-rejected"]').exists()).toBe(false);
    expect(wrapper.findAll("details.tl__skipped")[0].text()).toContain("Reason: too early");
    expect(wrapper.findAll("details.tl__skipped")[0].text()).toContain("Ping");
  });

  // m5 (walk 3): a message that may not go out is "Not sent" (Blocked is the word for a contact), the reason its tooltip
  it("a suppressed message reads Not sent with the reason as its tooltip", () => {
    const wrapper = mountTl({ props: { messages: [{ ...messages[1], status: "suppressed" }] } });
    const badge = wrapper.get('[data-testid="status-suppressed"]');
    expect(badge.text()).toBe("Not sent");
    expect(badge.attributes("title")).toContain("may not be mailed");
  });

  // FIX-17b item 15: a waiting bubble says what the Inbox says — the shared send state of its own `next_slot`.
  it("two waiting follow-ups with the same subject each state their own next_slot by message id", () => {
    channelTimeZone.value = "UTC";
    const first = { ...messages[2], message_id: 11 };
    const second = { ...messages[2], message_id: 12 };
    const waiting = [
      { id: 12, subject: "Follow", next_slot: "2099-01-02T08:00:00Z" },
      { id: 11, subject: "Follow", next_slot: new Date(Date.now() - 7 * 60000).toISOString() },
    ];
    const wrapper = mountTl({ props: { messages: [first, second], waiting } });
    // P8 (walk 3): the badge is "Scheduled"; the sentence is its tooltip and the phone's line under the bubble
    expect(wrapper.findAll('[data-testid="status-scheduled"]').map((node) => node.text())).toEqual(["Scheduled", "Scheduled"]);
    expect(wrapper.get('[data-testid="status-scheduled"]').attributes("title")).toContain("goes out within minutes");
    const states = wrapper.findAll('[data-testid="timeline-send-state"]').map((node) => node.text());
    expect(states[0]).toContain("goes out within minutes — the send window is open");
    expect(states[1]).toContain("goes out at 02.01 08:00");
    expect(wrapper.find('[data-testid="timeline-time"]').exists()).toBe(false);
    channelTimeZone.value = undefined;
  });

  it("a waiting mail with the cap used up says so, whatever its slot", () => {
    applyPolicy({ timezone: "UTC", sent_today: 5, daily_cap: 5 });
    const wrapper = mountTl({ props: { messages: [messages[2]], waiting: [{ id: 7, next_slot: "2099-01-02T08:00:00Z" }] } });
    expect(wrapper.get('[data-testid="timeline-send-state"]').text()).toContain("daily cap reached");
    applyPolicy(null);
  });

  it("a sent message keeps its own time", () => {
    const wrapper = mountTl({ props: { messages: [messages[1]] } });
    expect(wrapper.find('[data-testid="timeline-time"]').exists()).toBe(true);
  });

  // FIX-17b item 3: a reply's quoted history is folded behind a toggle.
  it("folds the quoted history of a reply behind a toggle", async () => {
    const body = "Hello,\n\nthanks.\n\n> On Mon, 14 Sep 2026 at 09:00, Outreach wrote:\n> Here is what we found.";
    const reply = { ...messages[0], body_text: body };
    const wrapper = mountTl({ props: { messages: [reply] } });
    expect(wrapper.get(".tl__body").text()).toBe("Hello,\n\nthanks.");
    expect(wrapper.find('[data-testid="timeline-quote"]').exists()).toBe(false);
    await wrapper.get('[data-testid="timeline-quote-toggle"]').trigger("click");
    expect(wrapper.get('[data-testid="timeline-quote"]').text()).toContain("Here is what we found.");
  });

  it("offers opt-out confirmation on a suspected opt-out reply", async () => {
    const optouts = [{ id: 3, received_at: "2026-09-21T09:00:00Z", optout_confirmed_at: null }];
    const wrapper = mountTl({ props: { messages, optouts } });
    await wrapper.get('[data-testid="confirm-optout"]').trigger("click");
    expect(wrapper.emitted("confirm-optout")).toBeUndefined();
    await wrapper.get('[data-testid="confirm-optout-yes"]').trigger("click");
    expect(wrapper.emitted("confirm-optout")[0]).toEqual([3]);
  });

  // M9: the opt-out waits for a confirmation that names the action and the contact.
  it("Confirm opt-out asks first, naming the contact; Cancel sends nothing", async () => {
    const optouts = [{ id: 3, received_at: "2026-09-21T09:00:00Z", optout_confirmed_at: null }];
    const wrapper = mountTl({ props: { messages, optouts, contact: "Jan Nowak" } });
    await wrapper.get('[data-testid="confirm-optout"]').trigger("click");
    expect(wrapper.text()).toContain("leads.thread.optout_confirm_message");
    await wrapper.get('[data-testid="confirm-dialog-cancel"]').trigger("click");
    expect(wrapper.find('[data-testid="confirm-optout-yes"]').exists()).toBe(false);
    expect(wrapper.emitted("confirm-optout")).toBeUndefined();
  });

  // plan 23: a timeline entry says `composed` itself
  it("tags an entry composed by hand without the activity list", () => {
    const own = { ...messages[1], message_id: 77, composed: true };
    const wrapper = mountTl({ props: { messages: [messages[1], own] } });
    expect(wrapper.text()).toContain("Mail written by hand");
  });

  // M17: a status word is a badge with its tone
  it("renders the message status as a StatusBadge with the tone of its kind", () => {
    const wrapper = mountTl({ props: { messages: [messages[1]] } });
    const badge = wrapper.getComponent('[data-testid="status-sent"]');
    expect(badge.props("tone")).toBe("positive");
    expect(badge.props("label")).toBe("Sent");
  });

  // M14: a mail written by hand is no follow-up
  it("tags a hand-written mail as such, not as a follow-up", () => {
    const written = { ...messages[2], message_id: 9, status: "sent" };
    const wrapper = mountTl({ props: { messages: [messages[1], written], composed: [9] } });
    expect(wrapper.get('[data-testid="timeline-tag"]').text()).toBe("Mail written by hand");
  });

  // B5: Reply on every inbound bubble opens Write mail with the reply, found by its moment in the thread's replies
  describe("Reply", () => {
    const company = { id: 5, name: "Acme", contacts: [{ id: 4, email: "Ewa@acme.test" }] };
    const inbound = { kind: "reply", at: "2026-09-21T09:00:00Z", direction: "in", status: "", subject: "Re: audit", body_text: "Call me", from_email: "ewa@acme.test" };
    beforeEach(() => {
      modules.crm = true;
      api.GET_Replies.mockResolvedValue({ data: { results: [{ id: 21, received_at: "2026-09-21T09:00:00Z" }] } });
    });

    it("is offered on inbound bubbles only, with a company and CRM on", () => {
      const wrapper = mountTl({ props: { messages: [messages[1], inbound], company, threadId: 8 } });
      expect(wrapper.findAll('[data-testid="reply-compose"]')).toHaveLength(1);
      modules.crm = false;
      expect(mountTl({ props: { messages: [inbound], company, threadId: 8 } }).find('[data-testid="reply-compose"]').exists()).toBe(false);
      expect(mountTl({ props: { messages: [inbound], threadId: 8 } }).find('[data-testid="reply-compose"]').exists()).toBe(false);
    });

    it("opens Write mail with reply id, subject, body and the sender's contact", async () => {
      const wrapper = mountTl({ props: { messages: [inbound], company, threadId: 8 } });
      await wrapper.get('[data-testid="reply-compose"]').trigger("click");
      await flushPromises();
      expect(api.GET_Replies).toHaveBeenCalledWith({ thread: 8, page_size: 100 });
      const dialog = wrapper.getComponent({ name: "ComposeDialog" });
      expect(dialog.props("open")).toBe(true);
      expect(dialog.props("reply")).toEqual({ id: 21, subject: "Re: audit", body: "Call me", contact_id: 4 });
    });

    it("a reply that cannot be found opens nothing", async () => {
      api.GET_Replies.mockResolvedValue({ data: { results: [] } });
      const wrapper = mountTl({ props: { messages: [inbound], company, threadId: 8 } });
      await wrapper.get('[data-testid="reply-compose"]').trigger("click");
      await flushPromises();
      expect(wrapper.getComponent({ name: "ComposeDialog" }).props("open")).toBe(false);
    });
  });
});
