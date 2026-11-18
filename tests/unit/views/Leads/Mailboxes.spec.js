import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_Mailboxes: vi.fn(),
  GET_Mailbox: vi.fn(),
  POST_Mailbox: vi.fn(),
  PATCH_Mailbox: vi.fn(),
  DELETE_Mailbox: vi.fn(),
  POST_MailboxTest: vi.fn(),
  POST_MailboxPause: vi.fn(() => Promise.resolve({ data: {} })),
  POST_MailboxResume: vi.fn(() => Promise.resolve({ data: {} })),
  GET_Health: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/api/leads/api", () => ({ GET_AssignableUsers: () => Promise.resolve([{ id: 7, username: "anna", name: "Anna Kowalska" }]) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
const route = vi.hoisted(() => ({ params: { id: "2" } }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => route, useRouter: () => router }));

import Mailboxes from "@/views/Leads/Mailboxes.vue";
import MailboxEdit from "@/views/Leads/MailboxEdit.vue";
import { byTestid, mountOutbound } from "./outboundFrame";

const mailbox = (extra = {}) => ({
  id: 2, address: "anna@firma.test", display_name: "Anna", user_id: 7, is_default: false, is_user_default: true,
  brand: "entirius", cc_addresses: ["michal@firma.test"], bcc_addresses: [], signature_html: "<p>Anna</p>",
  state: "active", smtp_host: "smtp.test", smtp_port: 587, smtp_security: "starttls", smtp_user: "", smtp_password_set: true,
  send_enabled: true, imap_host: "", imap_port: 993, imap_use_ssl: true, imap_user: "", imap_password_set: false,
  folder: "INBOX", receive_enabled: false, daily_cap: 40, warmup_start_cap: null, warmup_step: 0, warmup_started_on: null,
  paused_at: null, pause_reason: "", ...extra,
});
const health = (extra = {}) => ({ data: { channel: { windows: {} }, mailboxes: [{ id: 2, sent_today: 12, cap_today: 40, ...extra }] } });
const mounted = async (component, options) => {
  const wrapper = mountOutbound(component, options);
  await flushPromises();
  return wrapper;
};

// Plan 14: Settings → Mailboxes and the mailbox form.
describe("Leads → Settings → Mailboxes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.id = "2";
    api.GET_Mailboxes.mockResolvedValue({ data: { results: [mailbox(), mailbox({ id: 3, address: "sales@firma.test", paused_at: "2026-11-12T08:00:00Z", state: "paused", pause_reason: "bounces" })] } });
    api.GET_Health.mockResolvedValue(health());
    api.GET_Mailbox.mockResolvedValue({ data: mailbox() });
  });

  it("lists every mailbox with its state, today's count and Pause or Resume", async () => {
    const wrapper = await mounted(Mailboxes);
    expect(wrapper.findAll('[data-testid="mailbox-row"]')).toHaveLength(2);
    // N26: the address is a link — the keyboard's way into the form
    expect(wrapper.findComponent('[data-testid="mailbox-link"]').props("to")).toMatchObject({ name: "LeadsMailboxEdit" });
    expect(byTestid(wrapper, "mailbox-today").text()).toBe("12 of 40");
    expect(byTestid(wrapper, "mailbox-pause").exists()).toBe(true);
    expect(byTestid(wrapper, "mailbox-resume").exists()).toBe(true);
  });

  it("empty, failed and read-only lists", async () => {
    api.GET_Mailboxes.mockResolvedValueOnce({ data: { results: [] } });
    expect(byTestid(await mounted(Mailboxes), "mailboxes-empty").exists()).toBe(true);
    api.GET_Mailboxes.mockRejectedValueOnce({ message: "down" });
    expect(byTestid(await mounted(Mailboxes), "mailbox-error").text()).toBe("down");
    const readonly = await mounted(Mailboxes, { write: false });
    expect(byTestid(readonly, "mailboxes-add").exists()).toBe(false);
    expect(byTestid(readonly, "mailbox-pause").exists()).toBe(false);
  });

  it("pause needs a reason", async () => {
    const wrapper = await mounted(Mailboxes);
    await byTestid(wrapper, "mailbox-pause").trigger("click");
    await byTestid(wrapper, "mailbox-reason-submit").trigger("click");
    expect(api.POST_MailboxPause).not.toHaveBeenCalled();
    wrapper.findComponent('[data-testid="mailbox-reason"]').vm.$emit("update:modelValue", "list import");
    await byTestid(wrapper, "mailbox-reason-submit").trigger("click");
    await flushPromises();
    expect(api.POST_MailboxPause).toHaveBeenCalledWith(2, "list import");
  });

  it("U12: the missing-reason error goes as soon as one character is typed", async () => {
    const wrapper = await mounted(Mailboxes);
    await byTestid(wrapper, "mailbox-pause").trigger("click");
    const reasonError = () => wrapper.findComponent({ name: "MailboxReasonDialog" }).findComponent({ name: "FormField" }).props("error");
    await byTestid(wrapper, "mailbox-reason-submit").trigger("click");
    expect(reasonError()).toBe("Give the reason");
    wrapper.findComponent('[data-testid="mailbox-reason"]').vm.$emit("update:modelValue", "l");
    await flushPromises();
    expect(reasonError()).toBe("");
  });

  it("the form never shows a stored password and never sends an empty one", async () => {
    api.PATCH_Mailbox.mockResolvedValue({ data: mailbox() });
    const wrapper = await mounted(MailboxEdit);
    const password = wrapper.findComponent('[data-testid="mailbox-smtp-password"]');
    expect(password.props("modelValue")).toBe("");
    expect(password.props("placeholder")).toBe("saved — leave empty to keep");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    const body = api.PATCH_Mailbox.mock.calls[0][1];
    expect(body).not.toHaveProperty("smtp_password");
    expect(body).not.toHaveProperty("imap_password");
    password.vm.$emit("update:modelValue", "typed-value");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(api.PATCH_Mailbox.mock.calls[1][1].smtp_password).toBe("typed-value");
  });

  // Acceptance C1: every result code in words with the next step; no raw code, never "refused" for an unreached server.
  it("test login says each result in words and what to do next", async () => {
    api.POST_MailboxTest.mockResolvedValue({ data: { smtp: "unreachable", imap: "not_configured" } });
    const wrapper = await mounted(MailboxEdit);
    await byTestid(wrapper, "mailbox-test").trigger("click");
    await flushPromises();
    const smtp = wrapper.findComponent('[data-testid="mailbox-test-smtp"]');
    expect([smtp.props("tone"), smtp.props("label")]).toEqual(["negative", "Server not reached"]);
    expect(wrapper.findComponent('[data-testid="mailbox-test-imap"]').props("label")).toBe("Not set up");
    expect(byTestid(wrapper, "mailbox-test-smtp-next").text()).toBe("The SMTP server did not answer: check the host, the port and the security setting, save, then test again.");
    expect(byTestid(wrapper, "mailbox-test-imap-next").text()).toContain("Fill in the IMAP part");
    expect(byTestid(wrapper, "mailbox-test-result").text()).not.toMatch(/unreachable|not_configured|refused/i);
  });

  // S4 (walk 3): a certificate the host does not accept is its own answer, never "Server not reached".
  it("test login names a refused certificate with what to do", async () => {
    api.POST_MailboxTest.mockResolvedValue({ data: { smtp: "certificate", imap: "ok" } });
    const wrapper = await mounted(MailboxEdit);
    await byTestid(wrapper, "mailbox-test").trigger("click");
    await flushPromises();
    const smtp = wrapper.findComponent('[data-testid="mailbox-test-smtp"]');
    expect([smtp.props("tone"), smtp.props("label")]).toEqual(["negative", "The server's certificate was not accepted"]);
    expect(byTestid(wrapper, "mailbox-test-smtp-next").text()).toContain("certificate this host does not trust");
  });

  it("test login shows both results; a 404 shows not found", async () => {
    api.POST_MailboxTest.mockResolvedValue({ data: { smtp: "ok", imap: "auth_failed" } });
    const wrapper = await mounted(MailboxEdit);
    await byTestid(wrapper, "mailbox-test").trigger("click");
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="mailbox-test-smtp"]').props("tone")).toBe("positive");
    expect(wrapper.findComponent('[data-testid="mailbox-test-imap"]').props("tone")).toBe("negative");
    api.GET_Mailbox.mockRejectedValueOnce({ httpStatus: 404 });
    expect(byTestid(await mounted(MailboxEdit), "mailbox-not-found").exists()).toBe(true);
  });

  it("a new mailbox is created and opened; read-only hides Save, Test login and Delete", async () => {
    route.params.id = "new";
    api.POST_Mailbox.mockResolvedValue({ data: mailbox({ id: 9 }) });
    const wrapper = await mounted(MailboxEdit);
    expect(api.GET_Mailbox).not.toHaveBeenCalled();
    // T7 (walk 4): an empty required field is named before the request
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(api.POST_Mailbox).not.toHaveBeenCalled();
    const errorOf = (label) => wrapper.findAllComponents({ name: "FormField" }).find((field) => field.props("label") === label).props("error");
    expect(errorOf("leads.mailbox.address")).toBe("Give the address");
    wrapper.findComponent('[data-testid="mailbox-address"]').vm.$emit("update:modelValue", "anna@firma.test");
    wrapper.findComponent('[data-testid="mailbox-smtp-host"]').vm.$emit("update:modelValue", "smtp.test");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith({ name: "LeadsMailboxEdit", params: { id: 9 } });
    route.params.id = "2";
    const readonly = await mounted(MailboxEdit, { write: false });
    ["mailbox-save", "mailbox-test", "mailbox-delete", "mailbox-pause"].forEach((id) => expect(byTestid(readonly, id).exists()).toBe(false));
  });

  // U21: several mailboxes per user — the brand column and the user's default on the list.
  it("lists the brand and marks the user's default mailbox", async () => {
    const wrapper = await mounted(Mailboxes);
    expect(wrapper.findComponent('[data-testid="mailboxes-table"]').props("columns").map((column) => column.key)).toContain("brand");
    expect(wrapper.findAll('[data-testid="mailbox-user-default"]')).toHaveLength(2);
  });

  // U20–U22: CC and BCC lists, brand, the user's default and the signature go out with the save; cc_address is gone.
  it("edits the CC / BCC lists, brand, user default and signature, and sends them", async () => {
    api.PATCH_Mailbox.mockResolvedValue({ data: mailbox() });
    const wrapper = await mounted(MailboxEdit);
    expect(wrapper.findAll('[data-testid="mailbox-cc-item"]').map((tag) => tag.text())).toEqual(["michal@firma.test"]);
    const bcc = wrapper.get('[data-testid="mailbox-bcc-input"] input');
    await bcc.setValue("Boss@Firma.test, team@firma.test; boss@firma.test");
    await bcc.trigger("keydown.enter");
    expect(wrapper.findAll('[data-testid="mailbox-bcc-item"]').map((tag) => tag.text())).toEqual(["boss@firma.test", "team@firma.test"]);
    await wrapper.findAll('[data-testid="mailbox-cc-item"] button')[0].trigger("click");
    wrapper.findComponent('[data-testid="mailbox-brand"]').vm.$emit("update:modelValue", " Ecom.House ");
    wrapper.findComponent('[data-testid="mailbox-user-default"]').vm.$emit("update:modelValue", false);
    wrapper.findComponent('[data-testid="mailbox-signature"]').vm.$emit("update:modelValue", "<p><b>Anna Nowak</b></p>");
    await flushPromises();
    expect(wrapper.get('[data-testid="mailbox-signature-preview"]').attributes("srcdoc")).toContain("<p><b>Anna Nowak</b></p>");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    const body = api.PATCH_Mailbox.mock.calls[0][1];
    expect(body).toMatchObject({
      cc_addresses: [],
      bcc_addresses: ["boss@firma.test", "team@firma.test"],
      brand: "ecom.house",
      is_user_default: false,
      signature_html: "<p><b>Anna Nowak</b></p>",
    });
    expect(body).not.toHaveProperty("cc_address");
  });

  it("a wrong address stays in the field with its error and holds the save; a bad brand is named", async () => {
    const wrapper = await mounted(MailboxEdit);
    const cc = wrapper.get('[data-testid="mailbox-cc-input"] input');
    await cc.setValue("not-an-address");
    await cc.trigger("keydown.enter");
    expect(cc.element.value).toBe("not-an-address");
    const errorOf = (label) => wrapper.findAllComponents({ name: "FormField" }).find((field) => field.props("label") === label).props("error");
    expect(errorOf("leads.mailbox.cc")).toBe("Not a valid e-mail address");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(api.PATCH_Mailbox).not.toHaveBeenCalled();
    await cc.setValue("");
    await cc.trigger("focusout");
    wrapper.findComponent('[data-testid="mailbox-brand"]').vm.$emit("update:modelValue", "ecom house!");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(errorOf("leads.mailbox.cc")).toBe("");
    expect(errorOf("leads.mailbox.brand")).toBe("Lower-case letters, digits, dot and hyphen only (up to 32)");
    expect(api.PATCH_Mailbox).not.toHaveBeenCalled();
  });

  it("a list holds at most 10 addresses; a mailbox without a user has no user-default switch", async () => {
    api.GET_Mailbox.mockResolvedValue({ data: mailbox({ user_id: null, cc_addresses: Array.from({ length: 9 }, (_, i) => `a${i}@firma.test`) }) });
    api.PATCH_Mailbox.mockResolvedValue({ data: mailbox() });
    const wrapper = await mounted(MailboxEdit);
    expect(wrapper.find('[data-testid="mailbox-user-default"]').exists()).toBe(false);
    const cc = wrapper.get('[data-testid="mailbox-cc-input"] input');
    await cc.setValue("x@firma.test y@firma.test");
    await cc.trigger("keydown.enter");
    expect(wrapper.findAll('[data-testid="mailbox-cc-item"]')).toHaveLength(10);
    expect(wrapper.find('[data-testid="mailbox-cc-input"]').exists()).toBe(false);
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(api.PATCH_Mailbox).not.toHaveBeenCalled(); // "At most 10 addresses" waits on the list
    await wrapper.findAll('[data-testid="mailbox-cc-item"] button')[0].trigger("click");
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    const body = api.PATCH_Mailbox.mock.calls[0][1];
    expect(body.cc_addresses).toHaveLength(9);
    expect(body).not.toHaveProperty("is_user_default");
  });
});
