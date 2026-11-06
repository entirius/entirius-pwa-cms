import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Mailbox: vi.fn(), PUT_Mailbox: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import Mailbox from "@/views/Communicator/Mailbox.vue";
import { mountOptions } from "./communicatorFrame";

const mountScreen = async () => {
  const wrapper = mount(Mailbox, mountOptions());
  await flushPromises();
  return wrapper;
};
const saved = { imap_host: "imap.mail.test", imap_port: 993, imap_use_ssl: true, imap_user: "outreach", has_password: true, folder: "INBOX", last_uid: 4, is_active: true, last_polled_at: null };

// S5: Leads → Settings → IMAP mailbox.
describe("Send settings — IMAP mailbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.PUT_Mailbox.mockResolvedValue({ data: saved });
  });

  it("starts empty with the defaults when none is configured (404)", async () => {
    api.GET_Mailbox.mockRejectedValue({ response: { status: 404 } });
    const wrapper = await mountScreen();
    expect(wrapper.find('[data-testid="mailbox-empty"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mailbox-folder"] input').element.value).toBe("INBOX");
    expect(wrapper.get('[data-testid="mailbox-port"] input').element.value).toBe("993");
  });

  it("refuses an empty host before calling the API", async () => {
    api.GET_Mailbox.mockRejectedValue({ response: { status: 404 } });
    const wrapper = await mountScreen();
    await wrapper.get("form").trigger("submit");
    expect(api.PUT_Mailbox).not.toHaveBeenCalled();
  });

  it("loads the saved mailbox and keeps the stored password when the field stays empty", async () => {
    api.GET_Mailbox.mockResolvedValue({ data: saved });
    const wrapper = await mountScreen();
    expect(wrapper.get('[data-testid="mailbox-host"] input').element.value).toBe("imap.mail.test");
    await wrapper.get('[data-testid="mailbox-user"] input').setValue("sales");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    const body = api.PUT_Mailbox.mock.calls[0][0];
    expect(body).toMatchObject({ imap_host: "imap.mail.test", imap_user: "sales", imap_port: 993, folder: "INBOX" });
    expect(body).not.toHaveProperty("imap_password");
  });

  it("sends a typed password and never shows it back", async () => {
    api.GET_Mailbox.mockResolvedValue({ data: saved });
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="mailbox-password"] input').setValue("s3cret");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(api.PUT_Mailbox.mock.calls[0][0].imap_password).toBe("s3cret");
    expect(wrapper.get('[data-testid="mailbox-password"] input').element.value).toBe("");
  });
});
