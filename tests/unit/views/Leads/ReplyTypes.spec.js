import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const comm = vi.hoisted(() => ({ GET_ReplyClassPlans: vi.fn() }));
vi.mock("@/api/communicator/api", () => comm);
const leads = vi.hoisted(() => ({ GET_Mailable: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);

import { useMuninStore } from "@/stores/munin";
import { mailboxState, problemText } from "@/utils/leadsOutbound";
import { resetReplyPlans } from "@/utils/leadsReplyPlans";
import InboxRow from "@/views/Leads/InboxRow.vue";
import SendCheckDialog from "@/views/Leads/SendCheckDialog.vue";
import ThreadTimeline from "@/views/Leads/ThreadTimeline.vue";
import { outboundStubs } from "./outboundFrame";

const reply = { kind: "reply", at: "2026-11-12T09:00:00Z", direction: "in", status: "", subject: "Re: offer", body_text: "Back on Monday" };
const outbound = (on) => {
  const munin = useMuninStore();
  munin.loaded = true;
  munin.modules = on ? [{ key: "communicator", version: "0.5.0", enabled_in_cms: true }] : [];
};
const stubs = { StatusBadge: outboundStubs.StatusBadge, RouterLink: outboundStubs.RouterLink };

// Plan 14: the reply type in the Inbox row and the conversation; "Why no mail?"; the shared outbound helpers.
describe("Reply types and outbound helpers", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetReplyPlans();
    vi.clearAllMocks();
    comm.GET_ReplyClassPlans.mockResolvedValue({ data: { results: [{ intent: "out_of_office", sequence: "pause_until_return" }] } });
  });

  it("a classified reply shows its type, the review marker, the return date, the confidence and what happens next", async () => {
    outbound(true);
    const item = { ...reply, intent: "out_of_office", intent_confidence: 0.8, intent_return_date: "2026-11-20", needs_review: true };
    const wrapper = mount(ThreadTimeline, { props: { messages: [item] }, global: { stubs } });
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="reply-type"]').props("tone")).toBe("neutral");
    expect(wrapper.find('[data-testid="reply-needs-review"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reply-back-on"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("80 % sure");
    expect(wrapper.get('[data-testid="reply-next"]').text()).toContain("sequence paused until");
  });

  it("an unclassified reply and an older backend look as today", async () => {
    outbound(false);
    const wrapper = mount(ThreadTimeline, { props: { messages: [{ ...reply, intent: "interested" }, reply] }, global: { stubs } });
    await flushPromises();
    expect(comm.GET_ReplyClassPlans).not.toHaveBeenCalled();
    expect(wrapper.findAll('[data-testid="reply-type"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="reply-next"]').exists()).toBe(false);
  });

  it("an Inbox reply row carries the type badge and the review marker", () => {
    const row = { id: 3, subject_ref: "x:1", subject: "Offer", replied: true, last_text: "Thanks", activity_at: "2026-11-12T09:00:00Z" };
    const wrapper = mount(InboxRow, { props: { row, reply: { intent: "interested", needs_review: true } }, global: { stubs } });
    expect(wrapper.get('[data-testid="inbox-item-type"]').attributes("data-type")).toBe("interested");
    expect(wrapper.find('[data-testid="inbox-item-review"]').exists()).toBe(true);
    const plain = mount(InboxRow, { props: { row }, global: { stubs } });
    expect(plain.find('[data-testid="inbox-item-type"]').exists()).toBe(false);
  });

  it("Why no mail? lists every reason of the gate", async () => {
    leads.GET_Mailable.mockResolvedValue({ data: { eligible: false, reasons: ["suppressed", "no_legal_basis"] } });
    const wrapper = mount(SendCheckDialog, { props: { companyId: 4, contact: null }, global: { stubs: { ...outboundStubs } } });
    await wrapper.setProps({ contact: { id: 8, first_name: "Ewa" } });
    await flushPromises();
    expect(leads.GET_Mailable).toHaveBeenCalledWith(4, 8);
    expect(wrapper.findAll('[data-testid="sendcheck-reasons"] li')).toHaveLength(2);
    expect(wrapper.findComponent('[data-testid="contact-mail-state"]').props("tone")).toBe("negative");
  });

  it("names the problem and the mailbox state in the panel's words", () => {
    expect(problemText("the message requires a legal footer and has none")).toContain("legal footer");
    expect(problemText("the mailbox a@b.test cannot send (disabled)")).toBe("The mailbox a@b.test cannot send (Sending off)");
    expect(problemText("something else")).toBe("something else");
    // S1 (walk 3): the recipient refusals of the approval check get the panel's words
    expect(problemText("the contact is flagged as the wrong person")).toBe("The contact is flagged as the wrong person");
    expect(problemText("the recipient opted out or is on the do-not-contact list")).toContain("do-not-contact list");
    expect(mailboxState({ state: "active", warmup_started_on: "2026-11-01", daily_cap: 40 }, 20)).toBe("warming_up");
    expect(mailboxState({ state: "active", send_enabled: false })).toBe("send_off");
    expect(mailboxState({ state: "needs_login" })).toBe("needs_login");
  });
});
