import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({ GET_Mailable: vi.fn(), POST_Compose: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/communicator/api", () => ({ GET_WaitingMessages: () => Promise.resolve([]) }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import ComposeDialog from "@/views/Leads/ComposeDialog.vue";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const contacts = [
  { id: 3, first_name: "Jan", last_name: "Nowak", email: "jan@acme.test", is_primary: true },
  { id: 4, first_name: "Ewa", last_name: "Lis", email: "ewa@acme.test", is_primary: false },
];
const company = { id: 5, name: "Acme", contacts };
const opened = async (props = {}) => {
  const wrapper = mountOutbound(ComposeDialog, { area: "leads.companies", stubs: { ...crmStubs, SendCheckDialog: true }, props: { open: false, company, ...props } });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
};
const type = (wrapper) => {
  setControl(wrapper, "compose-subject", "Offer");
  setControl(wrapper, "compose-body", "Hello");
};

// Plan 15: Write mail — the outreach gate decides, its refusal reason is shown.
describe("Leads → Write mail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leads.GET_Mailable.mockResolvedValue({ data: { eligible: true, reasons: [] } });
    leads.POST_Compose.mockResolvedValue({ data: { message_id: 11, status: "approved" } });
  });

  it("goes to the primary contact and sends subject and message", async () => {
    const wrapper = await opened();
    expect(wrapper.findComponent('[data-testid="compose-to"]').props("modelValue")).toBe(3);
    type(wrapper);
    await byTestid(wrapper, "compose-send").trigger("click");
    await flushPromises();
    expect(leads.POST_Compose).toHaveBeenCalledWith(5, { contact_id: 3, subject: "Offer", body: "Hello" });
    expect(wrapper.emitted("sent")).toHaveLength(1);
  });

  it("answering a reply: its contact, Re: subject and reply_id", async () => {
    const wrapper = await opened({ reply: { id: 21, subject: "Offer", body: "Call me", contact_id: 4 } });
    expect(wrapper.findComponent('[data-testid="compose-to"]').props("modelValue")).toBe(4);
    expect(wrapper.findComponent('[data-testid="compose-subject"]').props("modelValue")).toBe("Re: Offer");
    setControl(wrapper, "compose-body", "Sure");
    await byTestid(wrapper, "compose-send").trigger("click");
    await flushPromises();
    expect(leads.POST_Compose.mock.lastCall[1]).toMatchObject({ reply_id: 21, contact_id: 4 });
  });

  // N3: one prefix, whatever the case of the one already there
  it.each(["Re: Offer", "RE: re:Offer", "Offer"])("answering %s is headed Re: Offer", async (subject) => {
    const wrapper = await opened({ reply: { id: 21, subject, body: "Call me", contact_id: 4 } });
    expect(wrapper.findComponent('[data-testid="compose-subject"]').props("modelValue")).toBe("Re: Offer");
  });

  it("a blocked contact disables Send with the gate's reason", async () => {
    leads.GET_Mailable.mockResolvedValue({ data: { eligible: false, reasons: ["suppressed"] } });
    const wrapper = await opened();
    expect(byTestid(wrapper, "compose-blocked").text()).toContain("address is on the do-not-contact list");
    expect(byTestid(wrapper, "compose-send").attributes("disabled")).toBeDefined();
  });

  // M15 / m3: the disabled Send is a real `disabled` button (the boot drops its fill); plan 34: the dismiss word is Cancel
  it("the dismiss button says Cancel, and Send stays a disabled primary on a blocked contact", async () => {
    leads.GET_Mailable.mockResolvedValue({ data: { eligible: false, reasons: ["suppressed"] } });
    const wrapper = await opened();
    expect(byTestid(wrapper, "compose-cancel").text()).toBe("common.cancel");
    const send = byTestid(wrapper, "compose-send");
    expect(send.attributes("disabled")).toBeDefined();
    expect(wrapper.findComponent('[data-testid="compose-send"]').props("variant")).toBe("primary");
  });

  it("a 409 refusal shows its reason under To and keeps the dialog open", async () => {
    leads.POST_Compose.mockRejectedValue({ error: "not_eligible", message: "contact opted out" });
    const wrapper = await opened();
    type(wrapper);
    await byTestid(wrapper, "compose-send").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "compose-error").text()).toBe("contact opted out");
    expect(wrapper.emitted("update:open")).toBeUndefined();
    leads.POST_Compose.mockRejectedValue({ error: "no_legal_basis" });
    await byTestid(wrapper, "compose-send").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "compose-error").text()).toBe("This contact has no legal basis — set it on the contact first");
  });

  it("closing with text typed asks to discard", async () => {
    const wrapper = await opened();
    type(wrapper);
    await byTestid(wrapper, "compose-cancel").trigger("click");
    expect(wrapper.emitted("update:open")).toBeUndefined();
    await byTestid(wrapper, "compose-discard-confirm").trigger("click");
    expect(wrapper.emitted("update:open")[0]).toEqual([false]);
  });
});
