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
  id: 2, address: "anna@firma.test", display_name: "Anna", cc_address: "", user_id: 7, is_default: false,
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
    expect(byTestid(wrapper, "mailbox-today").text()).toBe("12 / 40");
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
    await byTestid(wrapper, "mailbox-save").trigger("click");
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith({ name: "LeadsMailboxEdit", params: { id: 9 } });
    route.params.id = "2";
    const readonly = await mounted(MailboxEdit, { write: false });
    ["mailbox-save", "mailbox-test", "mailbox-delete", "mailbox-pause"].forEach((id) => expect(byTestid(readonly, id).exists()).toBe(false));
  });
});
